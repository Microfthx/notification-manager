import { Request, Response } from 'express';
import { WeiboSessionService } from '../services/weiboSessionService';

export class WeiboSessionController {
    private service: WeiboSessionService;

    constructor(service: WeiboSessionService) {
        this.service = service;
    }

    public getStatus(_req: Request, res: Response): void {
        res.status(200).json(this.service.getStatus());
    }

    public async sync(_req: Request, res: Response): Promise<void> {
        const status = await this.service.syncNow();
        res.status(status.state === 'error' ? 500 : 200).json(status);
    }

    public startQrLogin(_req: Request, res: Response): void {
        try {
            res.status(202).json(this.service.startQrLogin());
        } catch (error) {
            res.status(409).json({ error: (error as Error).message });
        }
    }

    public cancelQrLogin(_req: Request, res: Response): void {
        res.status(200).json(this.service.cancelQrLogin());
    }
}
