import * as path from 'path';

const resolveConfiguredPath = (value: string | undefined, fallback: string): string =>
    value ? path.resolve(value) : fallback;

export const projectRoot = resolveConfiguredPath(
    process.env.PROJECT_ROOT,
    path.resolve(__dirname, '../../..'),
);

export const botsRoot = resolveConfiguredPath(
    process.env.BOTS_ROOT,
    path.join(projectRoot, 'bots'),
);

export const logsRoot = resolveConfiguredPath(
    process.env.LOGS_ROOT,
    path.join(projectRoot, 'logs'),
);

export const aioProjectRoot = resolveConfiguredPath(
    process.env.AIO_PROJECT_ROOT,
    path.resolve(projectRoot, '..', 'aio-dynamic-push-master'),
);

export const aioConfigTemplatePath = resolveConfiguredPath(
    process.env.AIO_CONFIG_TEMPLATE_PATH,
    path.join(aioProjectRoot, 'config copy.yml'),
);

export const aioMainPath = resolveConfiguredPath(
    process.env.AIO_MAIN_PATH,
    path.join(aioProjectRoot, 'main.py'),
);

export const aioLogPath = resolveConfiguredPath(
    process.env.AIO_LOG_PATH,
    path.join(aioProjectRoot, 'aio-dynamic-push.log'),
);

export const backendLogPath = path.join(logsRoot, 'app.log');

export const weiboProfileRoot = resolveConfiguredPath(
    process.env.WEIBO_PROFILE_ROOT,
    path.join(projectRoot, 'data', 'weibo-profile'),
);

export const weiboSessionWorkerPath = resolveConfiguredPath(
    process.env.WEIBO_SESSION_WORKER_PATH,
    path.resolve(__dirname, '../../workers/weibo_session.py'),
);

export const weiboQrLoginWorkerPath = resolveConfiguredPath(
    process.env.WEIBO_QR_LOGIN_WORKER_PATH,
    path.resolve(__dirname, '../../workers/weibo_qr_login.py'),
);
