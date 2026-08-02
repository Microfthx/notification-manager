import { Request, Response } from 'express';
import { AioConfigService } from '../services/aioConfigService';
import { Logger } from '../utils/logger';

export class AioConfigController {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger ?? new Logger();
    }

    private getBotId(req: Request): string | null {
        const botId = req.params.botId;
        if (typeof botId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(botId.trim())) {
            return null;
        }

        return botId.trim();
    }

    private isConfig(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    public getConfig(req: Request, res: Response): void {
        const botId = this.getBotId(req);
        if (!botId) {
            res.status(400).json({ error: 'botId is required' });
            return;
        }

        try {
            const aioConfigService = new AioConfigService(botId);
            const config = aioConfigService.getConfig();
            if (!config) {
                res.status(404).json({ error: 'AIO config not found' });
                return;
            }

            res.status(200).json({
                botId,
                path: aioConfigService.getConfigPath(),
                config,
            });
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public updateConfig(req: Request, res: Response): void {
        const botId = this.getBotId(req);
        if (!botId) {
            res.status(400).json({ error: 'botId is required' });
            return;
        }

        if (!this.isConfig(req.body)) {
            res.status(400).json({ error: 'Config must be a JSON object' });
            return;
        }

        try {
            const aioConfigService = new AioConfigService(botId);
            const updated = aioConfigService.updateConfig(req.body);
            if (!updated) {
                res.status(404).json({ error: 'AIO config not found' });
                return;
            }

            res.status(200).json({
                botId,
                path: aioConfigService.getConfigPath(),
                config: updated,
            });
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }
}
