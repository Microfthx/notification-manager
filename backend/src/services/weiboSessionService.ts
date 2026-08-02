import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { AioConfigService } from './aioConfigService';
import { BotManager } from './botManager';
import { Logger } from '../utils/logger';
import { weiboProfileRoot, weiboQrLoginWorkerPath, weiboSessionWorkerPath } from '../utils/paths';

type SessionState = 'idle' | 'checking' | 'authenticated' | 'expired' | 'error';
type QrLoginState = 'idle' | 'preparing' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';

export type WeiboQrLoginStatus = {
    state: QrLoginState;
    imageDataUrl: string | null;
    expiresAt: string | null;
    message: string;
};

export type WeiboSessionStatus = {
    enabled: boolean;
    state: SessionState;
    intervalSeconds: number;
    lastCheckAt: string | null;
    lastSuccessAt: string | null;
    nextCheckAt: string | null;
    updatedBotIds: string[];
    message: string;
    qrLogin: WeiboQrLoginStatus;
};

type WorkerResult = {
    authenticated?: boolean;
    accountId?: string;
    cookie?: string;
    httpStatus?: number | null;
    error?: string;
};

type QrWorkerEvent = {
    event?: 'qr' | 'scanned' | 'authenticated' | 'expired' | 'error';
    imageDataUrl?: string;
    expiresAt?: string;
    accountId?: string;
    cookie?: string;
    error?: string;
};

export class WeiboSessionService {
    private botManager: BotManager;
    private logger: Logger;
    private intervalSeconds: number;
    private initialDelaySeconds: number;
    private timer: NodeJS.Timeout | null = null;
    private initialTimer: NodeJS.Timeout | null = null;
    private activeSync: Promise<WeiboSessionStatus> | null = null;
    private qrProcess: ChildProcessWithoutNullStreams | null = null;
    private qrOutputBuffer = '';
    private status: WeiboSessionStatus;

    constructor(botManager: BotManager, logger?: Logger) {
        this.botManager = botManager;
        this.logger = logger ?? new Logger();
        this.intervalSeconds = this.readPositiveNumber(process.env.WEIBO_SESSION_INTERVAL_SECONDS, 4 * 60 * 60);
        this.initialDelaySeconds = this.readPositiveNumber(process.env.WEIBO_SESSION_INITIAL_DELAY_SECONDS, 60);
        this.status = {
            enabled: process.env.WEIBO_SESSION_ENABLED !== 'false',
            state: 'idle',
            intervalSeconds: this.intervalSeconds,
            lastCheckAt: null,
            lastSuccessAt: null,
            nextCheckAt: null,
            updatedBotIds: [],
            message: 'Waiting for the first session check.',
            qrLogin: {
                state: 'idle',
                imageDataUrl: null,
                expiresAt: null,
                message: 'No QR login is active.',
            },
        };
    }

    private readPositiveNumber(value: string | undefined, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    }

    public start(): void {
        if (!this.status.enabled || this.timer || this.initialTimer) {
            return;
        }

        this.status.nextCheckAt = new Date(Date.now() + this.initialDelaySeconds * 1000).toISOString();
        this.initialTimer = setTimeout(() => {
            this.initialTimer = null;
            void this.syncNow();
        }, this.initialDelaySeconds * 1000);
        this.timer = setInterval(() => void this.syncNow(), this.intervalSeconds * 1000);
    }

    public stop(): void {
        if (this.initialTimer) {
            clearTimeout(this.initialTimer);
            this.initialTimer = null;
        }
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.status.nextCheckAt = null;
    }

    public getStatus(): WeiboSessionStatus {
        return {
            ...this.status,
            updatedBotIds: [...this.status.updatedBotIds],
            qrLogin: { ...this.status.qrLogin },
        };
    }

    public syncNow(): Promise<WeiboSessionStatus> {
        if (!this.status.enabled) {
            return Promise.resolve(this.getStatus());
        }
        if (this.activeSync) {
            return this.activeSync;
        }
        if (this.qrProcess) {
            return Promise.resolve(this.getStatus());
        }

        this.activeSync = this.performSync().finally(() => {
            this.activeSync = null;
        });
        return this.activeSync;
    }

    public startQrLogin(): WeiboSessionStatus {
        if (!this.status.enabled) {
            throw new Error('Weibo session management is disabled.');
        }
        if (this.activeSync) {
            throw new Error('A Weibo session check is currently running.');
        }
        if (this.qrProcess) {
            return this.getStatus();
        }

        const pythonBin = process.env.AIO_PYTHON_BIN || 'python3';
        const child: ChildProcessWithoutNullStreams = spawn(pythonBin, [weiboQrLoginWorkerPath], {
            env: {
                ...process.env,
                CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        this.qrProcess = child;
        this.qrOutputBuffer = '';
        this.status.qrLogin = {
            state: 'preparing',
            imageDataUrl: null,
            expiresAt: null,
            message: 'Preparing the official Weibo QR code.',
        };

        let stderr = '';
        child.stdout.on('data', (chunk) => this.consumeQrOutput(child, chunk.toString()));
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => this.failQrLogin(child, error.message));
        child.on('exit', (code) => {
            if (this.qrProcess !== child) {
                return;
            }
            this.qrProcess = null;
            if (['preparing', 'waiting', 'scanned'].includes(this.status.qrLogin.state)) {
                this.status.qrLogin = {
                    state: code === 0 ? 'expired' : 'error',
                    imageDataUrl: null,
                    expiresAt: null,
                    message: stderr.trim() || (code === 0
                        ? 'The Weibo QR code expired.'
                        : `Weibo QR login worker exited with code ${code}.`),
                };
            }
        });
        child.stdin.end(JSON.stringify({ profileDir: weiboProfileRoot }));
        return this.getStatus();
    }

    public cancelQrLogin(): WeiboSessionStatus {
        const child = this.qrProcess;
        this.qrProcess = null;
        if (child) {
            child.kill('SIGTERM');
        }
        this.qrOutputBuffer = '';
        this.status.qrLogin = {
            state: 'idle',
            imageDataUrl: null,
            expiresAt: null,
            message: 'QR login was cancelled.',
        };
        return this.getStatus();
    }

    private consumeQrOutput(child: ChildProcessWithoutNullStreams, output: string): void {
        if (this.qrProcess !== child) {
            return;
        }
        this.qrOutputBuffer += output;
        const lines = this.qrOutputBuffer.split(/\r?\n/);
        this.qrOutputBuffer = lines.pop() || '';
        lines.filter(Boolean).forEach((line) => {
            try {
                void this.handleQrEvent(child, JSON.parse(line) as QrWorkerEvent);
            } catch (error) {
                this.failQrLogin(child, `Invalid QR login response: ${(error as Error).message}`);
            }
        });
    }

    private async handleQrEvent(child: ChildProcessWithoutNullStreams, event: QrWorkerEvent): Promise<void> {
        if (this.qrProcess !== child) {
            return;
        }
        if (event.event === 'qr' && event.imageDataUrl) {
            this.status.qrLogin = {
                state: 'waiting',
                imageDataUrl: event.imageDataUrl,
                expiresAt: event.expiresAt || null,
                message: 'Scan with the Weibo app and confirm login on your phone.',
            };
            return;
        }
        if (event.event === 'scanned') {
            this.status.qrLogin = {
                ...this.status.qrLogin,
                state: 'scanned',
                message: 'QR code scanned; confirm login on your phone.',
            };
            return;
        }
        if (event.event === 'authenticated' && event.cookie) {
            const updatedBotIds = this.applyCookie(event.cookie);
            const account = this.maskAccountId(event.accountId);
            this.status = {
                ...this.status,
                state: 'authenticated',
                lastCheckAt: new Date().toISOString(),
                lastSuccessAt: new Date().toISOString(),
                nextCheckAt: this.nextCheckAt(),
                updatedBotIds,
                message: `Weibo QR login ${account} succeeded and synced to ${updatedBotIds.length} bot(s).`,
                qrLogin: {
                    state: 'success',
                    imageDataUrl: null,
                    expiresAt: null,
                    message: 'Login succeeded; bot cookies have been synchronized.',
                },
            };
            this.logger.info(this.status.message);
            return;
        }
        if (event.event === 'expired') {
            this.status.qrLogin = {
                state: 'expired',
                imageDataUrl: null,
                expiresAt: null,
                message: 'The Weibo QR code expired. Generate a new one to retry.',
            };
            return;
        }
        if (event.event === 'error') {
            this.failQrLogin(child, event.error || 'Unknown Weibo QR login error.');
        }
    }

    private failQrLogin(child: ChildProcessWithoutNullStreams, message: string): void {
        if (this.qrProcess !== child) {
            return;
        }
        this.status.qrLogin = {
            state: 'error',
            imageDataUrl: null,
            expiresAt: null,
            message,
        };
        this.logger.error(`Weibo QR login failed: ${message}`);
        child.kill('SIGTERM');
    }

    private getAioConfigs(): Array<{ botId: string; service: AioConfigService; config: Record<string, unknown> }> {
        const configs: Array<{ botId: string; service: AioConfigService; config: Record<string, unknown> }> = [];
        this.botManager.getBots().forEach((bot) => {
            const service = new AioConfigService(bot.id);
            const config = service.getConfig();
            if (config) {
                configs.push({ botId: bot.id, service, config });
            }
        });
        return configs;
    }

    private getWeiboTasks(config: Record<string, unknown>): Array<Record<string, unknown>> {
        const tasks = config.query_task;
        if (!Array.isArray(tasks)) {
            return [];
        }
        return tasks.filter((task): task is Record<string, unknown> => (
            typeof task === 'object' && task !== null && (task as Record<string, unknown>).type === 'weibo'
        ));
    }

    private runWorker(initialCookie: string): Promise<WorkerResult> {
        const pythonBin = process.env.AIO_PYTHON_BIN || 'python3';
        return new Promise((resolve, reject) => {
            const child: ChildProcessWithoutNullStreams = spawn(pythonBin, [weiboSessionWorkerPath], {
                env: {
                    ...process.env,
                    CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
                },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
            child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            child.on('error', reject);
            child.on('exit', (code) => {
                const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
                const lastLine = lines[lines.length - 1];
                if (code !== 0 || !lastLine) {
                    reject(new Error(stderr.trim() || `Weibo browser worker exited with code ${code}`));
                    return;
                }
                try {
                    const result = JSON.parse(lastLine) as WorkerResult;
                    if (result.error) {
                        reject(new Error(result.error));
                        return;
                    }
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Invalid browser worker response: ${(error as Error).message}`));
                }
            });
            child.stdin.end(JSON.stringify({
                initialCookie,
                profileDir: weiboProfileRoot,
            }));
        });
    }

    private maskAccountId(accountId: string | undefined): string {
        if (!accountId) {
            return '';
        }
        return accountId.length <= 4 ? accountId : `***${accountId.slice(-4)}`;
    }

    private authCookieFingerprint(cookie: unknown): string {
        if (typeof cookie !== 'string') {
            return '';
        }
        const authCookieNames = new Set(['ALF', 'MLOGIN', 'SCF', 'SUB', 'SUBP']);
        return cookie
            .split(';')
            .map((item) => item.trim())
            .filter((item) => authCookieNames.has(item.split('=', 1)[0]))
            .sort()
            .join(';');
    }

    private applyCookie(cookie: string): string[] {
        const updatedBotIds: string[] = [];
        for (const { botId, service, config } of this.getAioConfigs()) {
            const tasks = this.getWeiboTasks(config);
            let changed = false;
            let authChanged = false;
            tasks.forEach((task) => {
                if (task.cookie !== cookie) {
                    if (this.authCookieFingerprint(task.cookie) !== this.authCookieFingerprint(cookie)) {
                        authChanged = true;
                    }
                    task.cookie = cookie;
                    changed = true;
                }
            });
            if (!changed) {
                continue;
            }
            service.updateConfig(config);
            updatedBotIds.push(botId);
            if (authChanged && this.botManager.getBotStatus(botId) === 'running') {
                this.botManager.restartBot(botId);
            }
        }
        return updatedBotIds;
    }

    private async performSync(): Promise<WeiboSessionStatus> {
        const checkedAt = new Date();
        this.status = {
            ...this.status,
            state: 'checking',
            lastCheckAt: checkedAt.toISOString(),
            updatedBotIds: [],
            message: 'Checking the persistent Weibo browser session.',
        };

        try {
            const configs = this.getAioConfigs();
            let initialCookie = '';
            for (const { config } of configs) {
                const task = this.getWeiboTasks(config).find((item) => (
                    typeof item.cookie === 'string' && item.cookie.length > 0
                ));
                if (task && typeof task.cookie === 'string') {
                    initialCookie = task.cookie;
                    break;
                }
            }

            if (!initialCookie) {
                throw new Error('No Weibo cookie is configured for browser bootstrap.');
            }

            const workerResult = await this.runWorker(initialCookie);
            if (!workerResult.authenticated || !workerResult.cookie) {
                this.status = {
                    ...this.status,
                    state: 'expired',
                    nextCheckAt: this.nextCheckAt(),
                    message: `Weibo browser session is not authenticated (HTTP ${workerResult.httpStatus ?? 'unknown'}).`,
                };
                return this.getStatus();
            }

            const updatedBotIds = this.applyCookie(workerResult.cookie);

            const account = this.maskAccountId(workerResult.accountId);
            this.status = {
                ...this.status,
                state: 'authenticated',
                lastSuccessAt: new Date().toISOString(),
                nextCheckAt: this.nextCheckAt(),
                updatedBotIds,
                message: updatedBotIds.length > 0
                    ? `Weibo session ${account} synced to ${updatedBotIds.length} bot(s).`
                    : `Weibo session ${account} is valid; cookies are already current.`,
            };
            this.logger.info(this.status.message);
        } catch (error) {
            const message = (error as Error).message;
            this.status = {
                ...this.status,
                state: 'error',
                nextCheckAt: this.nextCheckAt(),
                message,
            };
            this.logger.error(`Weibo session sync failed: ${message}`);
        }

        return this.getStatus();
    }

    private nextCheckAt(): string {
        return new Date(Date.now() + this.intervalSeconds * 1000).toISOString();
    }
}
