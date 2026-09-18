import axios, { AxiosRequestConfig } from 'axios';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import QRCode from 'qrcode';
import { AioConfigService } from './aioConfigService';
import { BotManager } from './botManager';
import { Logger } from '../utils/logger';
import { napcatAlertWorkerPath, napcatConfigRoot } from '../utils/paths';

type NapCatState = 'checking' | 'online' | 'offline' | 'unavailable';
type NapCatQrState = 'idle' | 'restarting' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';

type NapCatConnection = {
    apiUrl: string;
    token: string;
};

export type NapCatStatus = {
    enabled: boolean;
    state: NapCatState;
    online: boolean;
    good: boolean;
    accountId: string | null;
    nickname: string | null;
    version: string | null;
    lastCheckAt: string | null;
    lastOnlineAt: string | null;
    consecutiveFailures: number;
    message: string;
    qrLogin: {
        state: NapCatQrState;
        imageDataUrl: string | null;
        expiresAt: string | null;
        message: string;
    };
};

type OneBotResponse<T> = {
    status?: string;
    retcode?: number;
    data?: T;
    message?: string;
    wording?: string;
};

type WebUiResponse<T> = {
    code?: number;
    data?: T;
    message?: string;
};

export class NapCatService {
    private readonly botManager: BotManager;
    private readonly logger: Logger;
    private readonly intervalSeconds: number;
    private readonly alertIntervalSeconds: number;
    private readonly offlineThreshold: number;
    private readonly webUiUrl: string;
    private timer: NodeJS.Timeout | null = null;
    private activeCheck: Promise<NapCatStatus> | null = null;
    private qrTimer: NodeJS.Timeout | null = null;
    private qrDeadline = 0;
    private webUiCredential: string | null = null;
    private lastAlertAt = 0;
    private alertSentForCurrentOutage = false;
    private status: NapCatStatus;

    constructor(botManager: BotManager, logger?: Logger) {
        this.botManager = botManager;
        this.logger = logger ?? new Logger();
        this.intervalSeconds = this.positiveNumber(process.env.NAPCAT_CHECK_INTERVAL_SECONDS, 30);
        this.alertIntervalSeconds = this.positiveNumber(process.env.NAPCAT_ALERT_INTERVAL_SECONDS, 6 * 60 * 60);
        this.offlineThreshold = this.positiveNumber(process.env.NAPCAT_OFFLINE_THRESHOLD, 3);
        this.webUiUrl = (process.env.NAPCAT_WEBUI_URL || 'http://127.0.0.1:6099/api').replace(/\/$/, '');
        this.status = {
            enabled: process.env.NAPCAT_MONITOR_ENABLED !== 'false',
            state: 'checking',
            online: false,
            good: false,
            accountId: null,
            nickname: null,
            version: null,
            lastCheckAt: null,
            lastOnlineAt: null,
            consecutiveFailures: 0,
            message: 'Waiting for the first NapCat status check.',
            qrLogin: {
                state: 'idle',
                imageDataUrl: null,
                expiresAt: null,
                message: 'No QQ QR login is active.',
            },
        };
    }

    private positiveNumber(value: string | undefined, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    public start(): void {
        if (!this.status.enabled || this.timer) {
            return;
        }
        setTimeout(() => void this.checkNow(), 3000);
        this.timer = setInterval(() => void this.checkNow(), this.intervalSeconds * 1000);
    }

    public getStatus(): NapCatStatus {
        return { ...this.status, qrLogin: { ...this.status.qrLogin } };
    }

    public checkNow(): Promise<NapCatStatus> {
        if (!this.status.enabled) {
            return Promise.resolve(this.getStatus());
        }
        if (this.activeCheck) {
            return this.activeCheck;
        }
        this.activeCheck = this.performCheck().finally(() => { this.activeCheck = null; });
        return this.activeCheck;
    }

    private findConnection(): NapCatConnection | null {
        for (const bot of this.botManager.getBots()) {
            const config = new AioConfigService(bot.id).getConfig();
            const channels = config?.push_channel;
            if (!Array.isArray(channels)) {
                continue;
            }
            const channel = channels.find((item): item is Record<string, unknown> => (
                typeof item === 'object' && item !== null
                && item.type === 'napcat_qq' && item.enable === true
                && typeof item.api_url === 'string'
            ));
            if (channel) {
                return {
                    apiUrl: String(channel.api_url).replace(/\/$/, ''),
                    token: typeof channel.token === 'string' ? channel.token : '',
                };
            }
        }
        return null;
    }

    private oneBotHeaders(token: string): Record<string, string> {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    private async performCheck(): Promise<NapCatStatus> {
        const checkedAt = new Date().toISOString();
        const connection = this.findConnection();
        if (!connection) {
            this.status = {
                ...this.status,
                state: 'unavailable',
                online: false,
                good: false,
                lastCheckAt: checkedAt,
                message: 'No enabled NapCat QQ channel is configured.',
            };
            return this.getStatus();
        }

        try {
            const headers = this.oneBotHeaders(connection.token);
            const [statusResponse, loginResponse, versionResponse] = await Promise.all([
                axios.get<OneBotResponse<{ online?: boolean; good?: boolean }>>(`${connection.apiUrl}/get_status`, { headers, timeout: 5000 }),
                axios.get<OneBotResponse<{ user_id?: number | string; nickname?: string }>>(`${connection.apiUrl}/get_login_info`, { headers, timeout: 5000 }),
                axios.get<OneBotResponse<{ app_version?: string }>>(`${connection.apiUrl}/get_version_info`, { headers, timeout: 5000 }),
            ]);
            const data = statusResponse.data.data || {};
            const login = loginResponse.data.data || {};
            const version = versionResponse.data.data || {};
            this.status = {
                ...this.status,
                accountId: login.user_id === undefined ? this.status.accountId : String(login.user_id),
                nickname: login.nickname || this.status.nickname,
                version: version.app_version || this.status.version,
            };
            const isOnline = statusResponse.data.status === 'ok'
                && statusResponse.data.retcode === 0
                && data.online === true
                && data.good === true;
            if (!isOnline) {
                await this.recordFailure(checkedAt, statusResponse.data.message || statusResponse.data.wording || 'NapCat reports that QQ is offline.');
                return this.getStatus();
            }

            const wasOffline = this.status.state === 'offline';
            this.status = {
                ...this.status,
                state: 'online',
                online: true,
                good: true,
                lastCheckAt: checkedAt,
                lastOnlineAt: checkedAt,
                consecutiveFailures: 0,
                message: 'NapCat is online and can send messages.',
            };
            if (wasOffline) {
                this.logger.info(`NapCat QQ ${this.status.accountId || ''} is online again.`);
            }
            this.alertSentForCurrentOutage = false;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? `NapCat API check failed: ${error.message}`
                : `NapCat API check failed: ${(error as Error).message}`;
            await this.recordFailure(checkedAt, message);
        }
        return this.getStatus();
    }

    private async recordFailure(checkedAt: string, message: string): Promise<void> {
        const failures = this.status.consecutiveFailures + 1;
        const confirmedOffline = failures >= this.offlineThreshold;
        this.status = {
            ...this.status,
            state: confirmedOffline ? 'offline' : 'checking',
            online: false,
            good: false,
            lastCheckAt: checkedAt,
            consecutiveFailures: failures,
            message: confirmedOffline
                ? `${message} Confirmed after ${failures} consecutive checks.`
                : `${message} Retrying (${failures}/${this.offlineThreshold}).`,
        };
        if (!confirmedOffline || this.isQrActive()) {
            return;
        }
        this.logger.error(`NapCat QQ offline: ${message}`);
        const now = Date.now();
        if (!this.alertSentForCurrentOutage && now - this.lastAlertAt >= this.alertIntervalSeconds * 1000) {
            this.alertSentForCurrentOutage = true;
            this.lastAlertAt = now;
            await this.sendOfflineAlert(message);
        }
    }

    private isQrActive(): boolean {
        return ['restarting', 'waiting', 'scanned'].includes(this.status.qrLogin.state);
    }

    private sendOfflineAlert(reason: string): Promise<void> {
        const configPaths = this.botManager.getBots()
            .map((bot) => new AioConfigService(bot.id).getConfigPath())
            .filter((configPath) => fs.existsSync(configPath));
        const pythonBin = process.env.AIO_PYTHON_BIN || 'python3';
        const content = [
            'NapCat QQ 已连续检测为离线，当前无法正常发送消息。',
            `同类异常 ${Math.round(this.alertIntervalSeconds / 3600)} 小时内仅提醒一次。`,
            `账号: ${this.status.nickname || '未知'} (${this.status.accountId || '未知'})`,
            `连续失败: ${this.status.consecutiveFailures} 次`,
            `原因: ${reason}`,
            '请打开通知管理页面扫码重新登录。',
        ].join('\n');

        return new Promise((resolve) => {
            const child: ChildProcessWithoutNullStreams = spawn(pythonBin, [napcatAlertWorkerPath], {
                env: { ...process.env, AIO_PROJECT_ROOT: process.env.AIO_PROJECT_ROOT || '' },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
            child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            child.on('error', (error) => {
                this.logger.error(`NapCat offline alert worker failed: ${error.message}`);
                resolve();
            });
            child.on('exit', (code) => {
                if (code === 0) {
                    this.logger.info(`NapCat offline alert dispatched. ${stdout.trim().split(/\r?\n/).pop() || ''}`);
                } else {
                    this.logger.error(`NapCat offline alert failed: ${stderr.trim() || `worker exited with code ${code}`}`);
                }
                resolve();
            });
            child.stdin.end(JSON.stringify({
                configPaths,
                title: '【NapCat QQ 离线】通知管理器',
                content,
            }));
        });
    }

    private readWebUiToken(): string {
        const configured = process.env.NAPCAT_WEBUI_TOKEN;
        if (configured) {
            return configured;
        }
        const configPath = `${napcatConfigRoot}/webui.json`;
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { token?: string };
        if (!config.token) {
            throw new Error('NapCat WebUI token is not configured.');
        }
        return config.token;
    }

    private async authenticateWebUi(): Promise<string> {
        const token = this.readWebUiToken();
        const hash = createHash('sha256').update(`${token}.napcat`).digest('hex');
        const response = await axios.post<WebUiResponse<{ Credential?: string }>>(
            `${this.webUiUrl}/auth/login`,
            { hash },
            { timeout: 5000 },
        );
        const credential = response.data.data?.Credential;
        if (response.data.code !== 0 || !credential) {
            throw new Error(response.data.message || 'NapCat WebUI authentication failed.');
        }
        this.webUiCredential = credential;
        return credential;
    }

    private async webUiPost<T>(path: string, retryAuth = true): Promise<T> {
        const credential = this.webUiCredential || await this.authenticateWebUi();
        const request: AxiosRequestConfig = {
            timeout: 7000,
            headers: { Authorization: `Bearer ${credential}` },
        };
        try {
            const response = await axios.post<WebUiResponse<T>>(`${this.webUiUrl}${path}`, {}, request);
            if (response.data.code !== 0) {
                throw new Error(response.data.message || `NapCat WebUI request failed: ${path}`);
            }
            return response.data.data as T;
        } catch (error) {
            if (retryAuth && axios.isAxiosError(error) && error.response?.status !== 404) {
                this.webUiCredential = null;
                return this.webUiPost<T>(path, false);
            }
            throw error;
        }
    }

    public async startQrLogin(): Promise<NapCatStatus> {
        if (this.isQrActive()) {
            return this.getStatus();
        }
        if (this.status.online) {
            throw new Error('NapCat QQ is already online. QR recovery is only available while offline.');
        }

        this.status.qrLogin = {
            state: 'restarting',
            imageDataUrl: null,
            expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
            message: 'Restarting NapCat in the existing tmux session.',
        };
        try {
            await this.webUiPost<unknown>('/Process/Restart');
        } catch (error) {
            this.logger.warn(`NapCat restart request disconnected as expected: ${(error as Error).message}`);
        }
        this.webUiCredential = null;
        this.qrDeadline = Date.now() + 3 * 60 * 1000;
        this.scheduleQrPoll(2500);
        return this.getStatus();
    }

    private scheduleQrPoll(delay: number): void {
        if (this.qrTimer) {
            clearTimeout(this.qrTimer);
        }
        this.qrTimer = setTimeout(() => void this.pollQrLogin(), delay);
    }

    private async pollQrLogin(): Promise<void> {
        this.qrTimer = null;
        if (!this.isQrActive()) {
            return;
        }
        if (Date.now() >= this.qrDeadline) {
            this.status.qrLogin = {
                state: 'expired',
                imageDataUrl: null,
                expiresAt: null,
                message: 'The QQ login QR code expired. Generate a new one to retry.',
            };
            return;
        }

        try {
            const login = await this.webUiPost<{ isLogin?: boolean; isOffline?: boolean; qrcodeurl?: string; loginError?: string }>('/QQLogin/CheckLoginStatus');
            if (login.isLogin) {
                this.status.qrLogin = {
                    state: 'success',
                    imageDataUrl: null,
                    expiresAt: null,
                    message: 'QQ login succeeded. Message delivery is available again.',
                };
                await this.checkNow();
                return;
            }

            let qrUrl = login.qrcodeurl || '';
            if (!qrUrl) {
                try {
                    const qr = await this.webUiPost<{ qrcode?: string }>('/QQLogin/GetQQLoginQrcode');
                    qrUrl = qr.qrcode || '';
                } catch (_error) {
                    // NapCat may still be starting or the phone may already have scanned the code.
                }
            }
            if (qrUrl) {
                this.status.qrLogin = {
                    ...this.status.qrLogin,
                    state: 'waiting',
                    imageDataUrl: await QRCode.toDataURL(qrUrl, { width: 320, margin: 2, errorCorrectionLevel: 'M' }),
                    message: 'Scan with mobile QQ and confirm login on your phone.',
                };
            } else if (this.status.qrLogin.state === 'waiting') {
                this.status.qrLogin = {
                    ...this.status.qrLogin,
                    state: 'scanned',
                    message: login.loginError || 'QR code scanned; waiting for confirmation on your phone.',
                };
            }
        } catch (error) {
            if (this.status.qrLogin.state !== 'restarting') {
                this.logger.warn(`NapCat QR login poll failed: ${(error as Error).message}`);
            }
        }
        this.scheduleQrPoll(2000);
    }

    public cancelQrLogin(): NapCatStatus {
        if (this.qrTimer) {
            clearTimeout(this.qrTimer);
            this.qrTimer = null;
        }
        this.status.qrLogin = {
            state: 'idle',
            imageDataUrl: null,
            expiresAt: null,
            message: 'QQ QR login monitoring was cancelled.',
        };
        return this.getStatus();
    }
}
