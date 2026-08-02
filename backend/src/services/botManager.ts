import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import type { BotConfig } from '../models/botConfig';
import { Logger } from '../utils/logger';
import {
    aioConfigTemplatePath,
    aioMainPath,
    backendLogPath,
    botsRoot,
    logsRoot,
} from '../utils/paths';
import { parseYaml, stringifyYaml } from '../utils/yaml';

type BotStatus = 'running' | 'stopped';

type BotRecord = {
    id: string;
    name: string;
    status: BotStatus;
};

type BotSummary = {
    id: string;
    name: string;
    status: BotStatus;
    autoStart: boolean;
};

export class BotManager {
    private bots: Map<string, BotRecord>;
    private runningProcesses: Map<string, ChildProcess>;
    private logger: Logger;
    private botsRoot: string;
    private logsRoot: string;
    private autoStartTimer: NodeJS.Timeout | null = null;
    private autoStartInitialTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.bots = new Map();
        this.runningProcesses = new Map();
        this.logger = new Logger();
        this.botsRoot = botsRoot;
        this.logsRoot = logsRoot;
        fs.mkdirSync(this.logsRoot, { recursive: true });
    }

    private getBotDir(botName: string): string {
        return path.join(this.botsRoot, botName);
    }

    private getConfigPath(botName: string): string {
        return path.join(this.getBotDir(botName), 'config.yml');
    }

    private getAioConfigPath(botName: string): string {
        return path.join(this.getBotDir(botName), 'aio-config.yml');
    }

    private resolveStatus(botName: string): BotStatus {
        return this.bots.has(botName) ? 'running' : 'stopped';
    }

    private listBotIds(): string[] {
        if (!fs.existsSync(this.botsRoot)) {
            return [];
        }

        return fs
            .readdirSync(this.botsRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort();
    }

    private safeReadFile(filePath: string): string | null {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        return fs.readFileSync(filePath, 'utf-8');
    }

    private localTimestamp(): string {
        const now = new Date();
        const pad = (value: number, width = 2) => String(value).padStart(width, '0');
        return [
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`,
        ].join(' ');
    }

    private tailLines(content: string, limit = 40): string[] {
        const lines = content
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter((line) => line.length > 0);
        const entries: string[][] = [];

        for (const line of lines) {
            const startsEntry = /^\d{4}-\d{2}-\d{2}[ T]/.test(line);
            if (startsEntry || entries.length === 0) {
                entries.push([line]);
            } else {
                // Keep traceback and continuation lines with their timestamped record.
                entries[entries.length - 1].push(line);
            }
        }

        const selected = entries.slice(-limit).reverse();
        const result: string[] = [];
        selected.forEach((entry) => result.push(...entry));
        return result;
    }

    private formatLogSection(title: string, filePath: string, content: string | null, limit = 60): string[] {
        if (!content) {
            return [`--- ${title} (${path.basename(filePath)}) ---`, 'No log file available.'];
        }

        return [`--- ${title} (${path.basename(filePath)}) ---`, ...this.tailLines(content, limit)];
    }

    private copyDirectory(sourceDir: string, targetDir: string): void {
        fs.mkdirSync(targetDir, { recursive: true });
        for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name);

            if (entry.isDirectory()) {
                this.copyDirectory(sourcePath, targetPath);
                continue;
            }

            fs.copyFileSync(sourcePath, targetPath);
        }
    }

    private isValidBotId(botName: string): boolean {
        return /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(botName);
    }

    private isAutoStartEnabled(botName: string): boolean {
        return this.loadConfig(botName)?.auto_start === true;
    }

    private ensureAutoStartedBots(): void {
        for (const botName of this.listBotIds()) {
            if (this.isAutoStartEnabled(botName) && this.resolveStatus(botName) === 'stopped') {
                this.logger.info(`Auto-start is enabled for ${botName}; starting bot.`);
                this.startBot(botName);
            }
        }
    }

    startAutoStartMonitor(): void {
        if (this.autoStartTimer || this.autoStartInitialTimer) {
            return;
        }
        const intervalSeconds = Number(process.env.BOT_AUTO_START_INTERVAL_SECONDS) || 15;
        this.autoStartInitialTimer = setTimeout(() => {
            this.autoStartInitialTimer = null;
            this.ensureAutoStartedBots();
        }, 2000);
        this.autoStartTimer = setInterval(
            () => this.ensureAutoStartedBots(),
            Math.max(intervalSeconds, 5) * 1000,
        );
    }

    loadConfig(botName: string): BotConfig | null {
        if (!this.isValidBotId(botName)) {
            this.logger.warn(`Invalid bot name: ${botName}`);
            return null;
        }

        const configPath = this.getConfigPath(botName);
        if (!fs.existsSync(configPath)) {
            this.logger.error(`Config file not found for bot: ${botName}`);
            return null;
        }

        return parseYaml<BotConfig>(fs.readFileSync(configPath, 'utf-8'));
    }

    saveConfig(botName: string, config: Record<string, unknown>): BotConfig | null {
        if (!this.isValidBotId(botName)) {
            this.logger.warn(`Invalid bot name: ${botName}`);
            return null;
        }

        const configPath = this.getConfigPath(botName);
        if (!fs.existsSync(configPath)) {
            this.logger.error(`Config file not found for bot: ${botName}`);
            return null;
        }

        fs.writeFileSync(configPath, stringifyYaml(config), 'utf-8');
        return this.loadConfig(botName);
    }

    createBot(botName: string, templateName = 'bot-example'): { id: string; name: string; status: string; autoStart: boolean; config: Record<string, unknown> } | null {
        if (!this.isValidBotId(botName)) {
            this.logger.warn(`Invalid bot name: ${botName}`);
            return null;
        }

        if (!this.isValidBotId(templateName)) {
            this.logger.warn(`Invalid bot template name: ${templateName}`);
            return null;
        }

        const targetDir = this.getBotDir(botName);
        if (fs.existsSync(targetDir)) {
            this.logger.warn(`Bot already exists: ${botName}`);
            return null;
        }

        const templateDir = this.getBotDir(templateName);
        if (!fs.existsSync(templateDir)) {
            this.logger.error(`Template bot not found: ${templateName}`);
            return null;
        }

        this.copyDirectory(templateDir, targetDir);
        const aioTargetPath = path.join(targetDir, 'aio-config.yml');
        if (fs.existsSync(aioConfigTemplatePath)) {
            fs.copyFileSync(aioConfigTemplatePath, aioTargetPath);
        }
        const config = this.loadConfig(botName);
        if (config) {
            config.auto_start = false;
            this.saveConfig(botName, config);
        }
        this.logger.info(`Bot ${botName} created from template ${templateName}.`);
        return this.getBot(botName);
    }

    startBot(botName: string): boolean {
        const config = this.loadConfig(botName);
        const botDir = this.getBotDir(botName);
        const aioConfigPath = this.getAioConfigPath(botName);
        const logFilePath = path.join(this.logsRoot, `${botName}.log`);

        if (!config) {
            return false;
        }

        if (!fs.existsSync(aioMainPath)) {
            this.logger.error(`AIO entry point not found: ${aioMainPath}`);
            return false;
        }

        if (!fs.existsSync(aioConfigPath)) {
            this.logger.error(`AIO config not found for bot ${botName}: ${aioConfigPath}`);
            return false;
        }

        if (this.runningProcesses.has(botName)) {
            this.logger.warn(`Bot ${botName} is already running.`);
            return true;
        }

        const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        const pythonBin = process.env.AIO_PYTHON_BIN || 'python3';
        const child = spawn(pythonBin, ['-u', aioMainPath], {
            cwd: botDir,
            env: {
                ...process.env,
                AIO_CONFIG_PATH: aioConfigPath,
                PYTHONUNBUFFERED: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        child.stdout?.pipe(logStream, { end: false });
        child.stderr?.pipe(logStream, { end: false });

        logStream.on('error', (error) => {
            this.logger.error(`Bot ${botName} log stream failed: ${error.message}`);
        });

        child.on('error', (error) => {
            this.logger.error(`Failed to start bot ${botName}: ${error.message}`);
            if (!logStream.destroyed && !logStream.writableEnded) {
                logStream.write(`${this.localTimestamp()} - ERROR: ${error.message}\n`);
            }
            if (this.runningProcesses.get(botName) === child) {
                this.runningProcesses.delete(botName);
                this.bots.delete(botName);
            }
        });

        child.on('close', (code, signal) => {
            if (!logStream.destroyed && !logStream.writableEnded) {
                logStream.end(`${this.localTimestamp()} - INFO: Bot ${botName} exited with code ${code ?? 'null'} signal ${signal ?? 'null'}\n`);
            }
            if (this.runningProcesses.get(botName) === child) {
                this.runningProcesses.delete(botName);
                this.bots.delete(botName);
            }
        });

        this.runningProcesses.set(botName, child);
        this.bots.set(botName, {
            id: botName,
            name: this.getDisplayName(botName),
            status: 'running',
        });
        this.logger.info(`Bot ${botName} started successfully.`);
        return true;
    }

    stopBot(botName: string): boolean {
        const child = this.runningProcesses.get(botName);
        if (child) {
            child.kill('SIGTERM');
            this.runningProcesses.delete(botName);
            this.bots.delete(botName);
            this.logger.info(`Bot ${botName} stopped successfully.`);
            return true;
        } else {
            this.logger.warn(`Bot ${botName} is not running.`);
        }

        return false;
    }

    restartBot(botName: string): boolean {
        this.stopBot(botName);
        const started = this.startBot(botName);
        if (started) {
            this.logger.info(`Bot ${botName} restarted successfully.`);
        }
        return started;
    }

    getBotStatus(botName: string): string {
        return this.resolveStatus(botName);
    }

    getDisplayName(botName: string): string {
        return botName
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    getBots(): BotSummary[] {
        return this.listBotIds().map((id) => ({
            id,
            name: this.getDisplayName(id),
            status: this.resolveStatus(id),
            autoStart: this.isAutoStartEnabled(id),
        }));
    }

    getBot(botName: string): { id: string; name: string; status: string; autoStart: boolean; config: Record<string, unknown> } | null {
        const config = this.loadConfig(botName);
        if (!config) {
            return null;
        }

        return {
            id: botName,
            name: this.getDisplayName(botName),
            status: this.resolveStatus(botName),
            autoStart: config.auto_start === true,
            config: config as Record<string, unknown>,
        };
    }

    setAutoStart(botName: string, enabled: boolean): BotSummary | null {
        const config = this.loadConfig(botName);
        if (!config) {
            return null;
        }
        config.auto_start = enabled;
        if (!this.saveConfig(botName, config)) {
            return null;
        }
        this.logger.info(`Auto-start for ${botName} ${enabled ? 'enabled' : 'disabled'}.`);
        if (enabled && this.resolveStatus(botName) === 'stopped') {
            this.startBot(botName);
        }
        return {
            id: botName,
            name: this.getDisplayName(botName),
            status: this.resolveStatus(botName),
            autoStart: enabled,
        };
    }

    updateBotConfig(botName: string, config: Record<string, unknown>): BotConfig | null {
        return this.saveConfig(botName, config);
    }

    getBotLogs(botName: string, mode: 'bot' | 'full' = 'bot'): string[] {
        if (!this.isValidBotId(botName)) {
            return ['Invalid bot ID.'];
        }

        const botLogFiles = [
            path.join(this.logsRoot, `${botName}-live.log`),
            path.join(this.logsRoot, `${botName}.log`),
        ];

        for (const filePath of botLogFiles) {
            const content = this.safeReadFile(filePath);
            if (content) {
                if (mode === 'bot') {
                    return this.tailLines(content, 40);
                }

                return [
                    ...this.formatLogSection('Bot AIO process log', filePath, content, 80),
                    '',
                    ...this.formatLogSection('Backend log', backendLogPath, this.safeReadFile(backendLogPath), 40),
                ];
            }
        }

        const fallback = [
            `${botName}: no log file available yet.`,
            'Start the bot or check the logs directory for output.',
        ];

        if (mode === 'bot') {
            return fallback;
        }

        return [
            ...fallback,
            '',
            ...this.formatLogSection('Backend log', backendLogPath, this.safeReadFile(backendLogPath), 40),
        ];
    }
}
