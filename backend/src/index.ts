import express from 'express';
import bodyParser from 'body-parser';
import { AioConfigController } from './controllers/aioConfigController';
import { BotsController } from './controllers/botsController';
import { WeiboSessionController } from './controllers/weiboSessionController';
import { NapCatController } from './controllers/napcatController';
import { BotManager } from './services/botManager';
import { WeiboSessionService } from './services/weiboSessionService';
import { NapCatService } from './services/napcatService';
import { Logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 4000;
const logger = new Logger();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((_, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

const botManager = new BotManager();
const botsController = new BotsController(logger, botManager);
const aioConfigController = new AioConfigController(logger);
const weiboSessionService = new WeiboSessionService(botManager, logger);
const weiboSessionController = new WeiboSessionController(weiboSessionService);
const napcatService = new NapCatService(botManager, logger);
const napcatController = new NapCatController(napcatService);

app.options('*', (_, res) => res.sendStatus(204));

app.get('/api/bots', (req, res) => botsController.getBots(req, res));
app.post('/api/bots', (req, res) => botsController.createBot(req, res));
app.get('/api/bots/:botId', (req, res) => botsController.getBot(req, res));
app.get('/api/bots/:botId/logs', (req, res) => botsController.getBotLogs(req, res));
app.put('/api/bots/:botId', (req, res) => botsController.updateBotConfig(req, res));
app.post('/api/bots/:botId/start', (req, res) => botsController.startBot(req, res));
app.post('/api/bots/:botId/stop', (req, res) => botsController.stopBot(req, res));
app.post('/api/bots/:botId/restart', (req, res) => botsController.restartBot(req, res));
app.put('/api/bots/:botId/auto-start', (req, res) => botsController.updateAutoStart(req, res));
app.get('/api/bots/:botId/aio-config', (req, res) => aioConfigController.getConfig(req, res));
app.put('/api/bots/:botId/aio-config', (req, res) => aioConfigController.updateConfig(req, res));
app.get('/api/weibo-session', (req, res) => weiboSessionController.getStatus(req, res));
app.post('/api/weibo-session/sync', (req, res) => void weiboSessionController.sync(req, res));
app.post('/api/weibo-session/qr-login', (req, res) => weiboSessionController.startQrLogin(req, res));
app.delete('/api/weibo-session/qr-login', (req, res) => weiboSessionController.cancelQrLogin(req, res));
app.get('/api/napcat', (req, res) => napcatController.getStatus(req, res));
app.post('/api/napcat/check', (req, res) => void napcatController.checkNow(req, res));
app.post('/api/napcat/qr-login', (req, res) => void napcatController.startQrLogin(req, res));
app.delete('/api/napcat/qr-login', (req, res) => napcatController.cancelQrLogin(req, res));

app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
    botManager.startAutoStartMonitor();
    weiboSessionService.start();
    napcatService.start();
});
