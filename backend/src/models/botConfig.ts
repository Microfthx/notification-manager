export interface BotConfig {
    profile_id?: string;
    cookie?: string;
    enable?: boolean;
    begin_time?: string;
    end_time?: string;
    len_of_deque?: number;
    enable_dynamic_check?: boolean;
    auto_start?: boolean;
    [key: string]: unknown;
}
