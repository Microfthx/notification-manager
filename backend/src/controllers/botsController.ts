import { Request, Response } from 'express';
import { BotManager } from '../services/botManager';
import { Logger } from '../utils/logger';

export class BotsController {
    private botManager: BotManager;
    private logger: Logger;

    constructor(logger?: Logger, botManager?: BotManager) {
        this.botManager = botManager ?? new BotManager();
        this.logger = logger ?? new Logger();
    }

    private isConfig(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    public startBot(req: Request, res: Response): void {
        const { botId } = req.params;
        try {
            const started = this.botManager.startBot(botId);
            if (!started) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            res.status(200).json({ message: 'Bot started successfully' });
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public stopBot(req: Request, res: Response): void {
        const { botId } = req.params;
        try {
            const stopped = this.botManager.stopBot(botId);
            if (!stopped) {
                res.status(404).json({ error: 'Bot not found or not running' });
                return;
            }

            res.status(200).json({ message: 'Bot stopped successfully' });
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public restartBot(req: Request, res: Response): void {
        const { botId } = req.params;
        try {
            const restarted = this.botManager.restartBot(botId);
            if (!restarted) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            res.status(200).json({ message: 'Bot restarted successfully' });
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public updateAutoStart(req: Request, res: Response): void {
        const { botId } = req.params;
        const { enabled } = req.body ?? {};
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled must be a boolean' });
            return;
        }
        try {
            const bot = this.botManager.setAutoStart(botId, enabled);
            if (!bot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }
            res.status(200).json(bot);
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public getBots(req: Request, res: Response): void {
        try {
            res.status(200).json(this.botManager.getBots());
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public createBot(req: Request, res: Response): void {
        const { botId } = req.body ?? {};
        const templateName = typeof req.body?.templateName === 'string' && req.body.templateName.trim().length > 0
            ? req.body.templateName
            : 'bot-example';

        if (typeof botId !== 'string' || botId.trim().length === 0) {
            res.status(400).json({ error: 'botId is required' });
            return;
        }

        try {
            const created = this.botManager.createBot(botId.trim(), templateName);
            if (!created) {
                res.status(400).json({ error: 'Failed to create bot' });
                return;
            }

            res.status(201).json(created);
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public getBot(req: Request, res: Response): void {
        const { botId } = req.params;
        try {
            const bot = this.botManager.getBot(botId);
            if (!bot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            res.status(200).json(bot);
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public getBotLogs(req: Request, res: Response): void {
        const { botId } = req.params;
        const view = req.query.view === 'full' ? 'full' : 'bot';
        try {
            res.status(200).json(this.botManager.getBotLogs(botId, view));
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }

    public updateBotConfig(req: Request, res: Response): void {
        const { botId } = req.params;
        const config = req.body;
        if (!this.isConfig(config)) {
            res.status(400).json({ error: 'Config must be a JSON object' });
            return;
        }
        try {
            const updated = this.botManager.updateBotConfig(botId, config);
            if (!updated) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            const bot = this.botManager.getBot(botId);
            res.status(200).json(bot ?? updated);
        } catch (err) {
            const error = err as Error;
            this.logger.error(error.message);
            res.status(500).json({ error: error.message });
        }
    }
}
