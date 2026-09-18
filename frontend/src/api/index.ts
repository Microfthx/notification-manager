import axios from 'axios';
import { BotConfig, BotStatus, NapCatStatus, WeiboSessionStatus } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

type Locale = 'en' | 'zh-CN';
type LogView = 'bot' | 'full';

export type AioConfigResponse = {
    botId: string;
    path: string;
    config: Record<string, unknown>;
};

export type CreateBotPayload = {
    botId: string;
    templateName?: string;
};

export const fetchBotConfigs = async (): Promise<BotStatus[]> => {
    const response = await axios.get(`${API_BASE_URL}/bots`);
    return response.data;
};

export const fetchBotsStatus = async (): Promise<BotStatus[]> => {
    const response = await axios.get(`${API_BASE_URL}/bots`);
    return response.data;
};

export const createBot = async (payload: CreateBotPayload): Promise<BotConfig> => {
    const response = await axios.post(`${API_BASE_URL}/bots`, payload);
    return response.data;
};

export const getBotConfig = async (botId: string): Promise<BotConfig> => {
    const response = await axios.get(`${API_BASE_URL}/bots/${botId}`);
    return response.data;
};

export const updateBotConfig = async (botId: string, config: Record<string, unknown>): Promise<BotConfig> => {
    const response = await axios.put(`${API_BASE_URL}/bots/${botId}`, config);
    return response.data;
};

export const startBot = async (botId: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/bots/${botId}/start`);
    return response.data;
};

export const stopBot = async (botId: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/bots/${botId}/stop`);
    return response.data;
};

export const restartBot = async (botId: string): Promise<{ message: string }> => {
    const response = await axios.post(`${API_BASE_URL}/bots/${botId}/restart`);
    return response.data;
};

export const updateBotAutoStart = async (botId: string, enabled: boolean): Promise<BotStatus> => {
    const response = await axios.put(`${API_BASE_URL}/bots/${botId}/auto-start`, { enabled });
    return response.data;
};

export const fetchAioConfig = async (botId: string): Promise<AioConfigResponse> => {
    const response = await axios.get(`${API_BASE_URL}/bots/${botId}/aio-config`);
    return response.data;
};

export const updateAioConfig = async (botId: string, config: Record<string, unknown>): Promise<AioConfigResponse> => {
    const response = await axios.put(`${API_BASE_URL}/bots/${botId}/aio-config`, config);
    return response.data;
};

export const fetchLogs = async (botId: string, _locale: Locale = 'en', view: LogView = 'bot'): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/bots/${botId}/logs`, {
        params: { view },
    });
    return response.data;
};

export const fetchWeiboSessionStatus = async (): Promise<WeiboSessionStatus> => {
    const response = await axios.get(`${API_BASE_URL}/weibo-session`);
    return response.data;
};

export const syncWeiboSession = async (): Promise<WeiboSessionStatus> => {
    const response = await axios.post(`${API_BASE_URL}/weibo-session/sync`);
    return response.data;
};

export const startWeiboQrLogin = async (): Promise<WeiboSessionStatus> => {
    const response = await axios.post(`${API_BASE_URL}/weibo-session/qr-login`);
    return response.data;
};

export const cancelWeiboQrLogin = async (): Promise<WeiboSessionStatus> => {
    const response = await axios.delete(`${API_BASE_URL}/weibo-session/qr-login`);
    return response.data;
};

export const fetchNapCatStatus = async (): Promise<NapCatStatus> => {
    const response = await axios.get(`${API_BASE_URL}/napcat`);
    return response.data;
};

export const checkNapCatStatus = async (): Promise<NapCatStatus> => {
    const response = await axios.post(`${API_BASE_URL}/napcat/check`);
    return response.data;
};

export const startNapCatQrLogin = async (): Promise<NapCatStatus> => {
    const response = await axios.post(`${API_BASE_URL}/napcat/qr-login`);
    return response.data;
};

export const cancelNapCatQrLogin = async (): Promise<NapCatStatus> => {
    const response = await axios.delete(`${API_BASE_URL}/napcat/qr-login`);
    return response.data;
};
