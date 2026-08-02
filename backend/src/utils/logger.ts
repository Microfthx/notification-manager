import * as fs from 'fs';
import * as path from 'path';
import { backendLogPath } from './paths';

export class Logger {
    private logFilePath: string;

    constructor() {
        this.logFilePath = backendLogPath;
        this.ensureLogFileExists();
    }

    private ensureLogFileExists() {
        fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '', { flag: 'wx' });
        }
    }

    public log(message: string) {
        const now = new Date();
        const pad = (value: number, width = 2) => String(value).padStart(width, '0');
        const timestamp = [
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`,
        ].join(' ');
        const logMessage = `${timestamp} - ${message}\n`;
        fs.appendFileSync(this.logFilePath, logMessage);
    }

    public info(message: string) {
        this.log(`INFO: ${message}`);
    }

    public error(message: string) {
        this.log(`ERROR: ${message}`);
    }

    public warn(message: string) {
        this.log(`WARN: ${message}`);
    }

    public debug(message: string) {
        this.log(`DEBUG: ${message}`);
    }
}

export default new Logger();
