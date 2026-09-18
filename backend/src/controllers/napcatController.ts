import { Request, Response } from 'express';
import { NapCatService } from '../services/napcatService';

export class NapCatController {
    constructor(private service: NapCatService) {}

    public getStatus(_req: Request, res: Response): void {
        res.status(200).json(this.service.getStatus());
    }

    public async checkNow(_req: Request, res: Response): Promise<void> {
        const status = await this.service.checkNow();
        res.status(status.state === 'unavailable' ? 503 : 200).json(status);
    }

    public async startQrLogin(_req: Request, res: Response): Promise<void> {
        try {
            res.status(202).json(await this.service.startQrLogin());
        } catch (error) {
            res.status(409).json({ error: (error as Error).message });
        }
    }

    public cancelQrLogin(_req: Request, res: Response): void {
        res.status(200).json(this.service.cancelQrLogin());
    }
}
