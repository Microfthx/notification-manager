export interface BotStatus {
    id: string;
    name: string;
    status: string;
    autoStart: boolean;
}

export interface BotConfig {
    id: string;
    name: string;
    status: string;
    autoStart?: boolean;
    config?: Record<string, unknown>;
}

export interface AioConfig {
    common?: Record<string, unknown>;
    query_task?: Record<string, unknown>[];
    push_channel?: Record<string, unknown>[];
}

export type WeiboSessionState = 'idle' | 'checking' | 'authenticated' | 'expired' | 'error';
export type WeiboQrLoginState = 'idle' | 'preparing' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';

export interface WeiboQrLoginStatus {
    state: WeiboQrLoginState;
    imageDataUrl: string | null;
    expiresAt: string | null;
    message: string;
}

export interface WeiboSessionStatus {
    enabled: boolean;
    state: WeiboSessionState;
    intervalSeconds: number;
    lastCheckAt: string | null;
    lastSuccessAt: string | null;
    nextCheckAt: string | null;
    updatedBotIds: string[];
    message: string;
    qrLogin: WeiboQrLoginStatus;
}

export type NapCatState = 'checking' | 'online' | 'offline' | 'unavailable';
export type NapCatQrState = 'idle' | 'restarting' | 'waiting' | 'scanned' | 'success' | 'expired' | 'error';

export interface NapCatStatus {
    enabled: boolean;
    state: NapCatState;
    online: boolean;
    good: boolean;
    accountId: string | null;
    nickname: string | null;
    version: string | null;
    lastCheckAt: string | null;
    lastOnlineAt: string | null;
    consecutiveFailures: number;
    message: string;
    qrLogin: {
        state: NapCatQrState;
        imageDataUrl: string | null;
        expiresAt: string | null;
        message: string;
    };
}
