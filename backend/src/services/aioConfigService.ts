import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { aioConfigTemplatePath, botsRoot } from '../utils/paths';
import { parseYaml, stringifyYaml } from '../utils/yaml';

export class AioConfigService {
    private logger: Logger;
    private botDir: string;
    private configPath: string;
    private templatePath: string;

    constructor(botId: string) {
        this.logger = new Logger();
        this.botDir = path.join(botsRoot, botId);
        this.configPath = path.join(this.botDir, 'aio-config.yml');
        this.templatePath = aioConfigTemplatePath;
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    private ensureFromTemplate(): void {
        if (fs.existsSync(this.configPath) || !fs.existsSync(this.botDir)) {
            return;
        }

        if (!fs.existsSync(this.templatePath)) {
            return;
        }

        fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
        fs.copyFileSync(this.templatePath, this.configPath);
    }

    public getConfig(): Record<string, unknown> | null {
        this.ensureFromTemplate();

        if (!fs.existsSync(this.configPath)) {
            this.logger.error(`AIO config file not found: ${this.configPath}`);
            return null;
        }

        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return parseYaml<Record<string, unknown>>(raw);
    }

    public updateConfig(config: Record<string, unknown>): Record<string, unknown> | null {
        if (!fs.existsSync(this.botDir)) {
            this.logger.error(`Bot directory not found: ${this.botDir}`);
            return null;
        }

        this.ensureFromTemplate();
        fs.mkdirSync(path.dirname(this.configPath), { recursive: true });

        const temporaryPath = `${this.configPath}.tmp`;
        fs.writeFileSync(temporaryPath, stringifyYaml(config), { encoding: 'utf-8', mode: 0o600 });
        fs.renameSync(temporaryPath, this.configPath);
        return this.getConfig();
    }
}
