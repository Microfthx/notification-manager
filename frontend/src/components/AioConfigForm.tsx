import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';

type AioConfigFormProps = {
    config?: Record<string, unknown> | null;
    sourcePath?: string;
    botId?: string | null;
    onUpdate?: (config: Record<string, unknown>) => Promise<void> | void;
};

type QueryTaskDraft = {
    name: string;
    enable: boolean;
    type: string;
    intervals_second: string;
    begin_time: string;
    end_time: string;
    target_push_name_list: string[];
    enable_dynamic_check: boolean;
    enable_living_check: boolean;
    uid_list: string[];
    skip_forward: boolean;
    cookie: string;
    payload: string;
    profile_id_list: string[];
    signature_server_url: string;
    username_list: string[];
    sec_uid_list: string[];
    douyin_id_list: string[];
    room_id_list: string[];
};

type PushTargetGroupDraft = {
    guild_name: string;
    channel_name_list: string[];
};

type PushChannelDraft = {
    name: string;
    enable: boolean;
    type: string;
    send_key: string;
    uid: string;
    tags: string;
    corp_id: string;
    agent_id: string;
    corp_secret: string;
    key: string;
    access_token: string;
    app_id: string;
    app_secret: string;
    receive_id_type: string;
    receive_id: string;
    webhook_key: string;
    api_token: string;
    chat_id: string;
    base_url: string;
    push_target_list: PushTargetGroupDraft[];
    api_url: string;
    token: string;
    user_id: string;
    group_id: string;
    at_qq: string;
    server_url: string;
    web_server_url: string;
    webhook_url: string;
    request_method: string;
    smtp_host: string;
    smtp_port: string;
    smtp_ssl: boolean;
    smtp_tls: boolean;
    sender_email: string;
    sender_password: string;
    receiver_email: string;
};

type AioConfigDraft = {
    common: {
        proxy_pool: {
            enable: boolean;
            proxy_pool_url: string;
        };
        push_channel: {
            send_test_msg_when_start: boolean;
        };
    };
    query_task: QueryTaskDraft[];
    push_channel: PushChannelDraft[];
};

const taskTypes = ['bilibili', 'weibo', 'xhs', 'douyin', 'douyu', 'huya'];
const channelTypes = [
    'serverChan_turbo',
    'serverChan_3',
    'wecom_apps',
    'wecom_bot',
    'dingtalk_bot',
    'feishu_apps',
    'feishu_bot',
    'telegram_bot',
    'qq_bot',
    'napcat_qq',
    'bark',
    'gotify',
    'webhook',
    'email',
];

const firstEnabledIndex = (items: Array<{ enable: boolean }>): number => {
    const enabledIndex = items.findIndex((item) => item.enable);
    return enabledIndex >= 0 ? enabledIndex : 0;
};

const emptyDraft = (): AioConfigDraft => ({
    common: {
        proxy_pool: {
            enable: false,
            proxy_pool_url: '',
        },
        push_channel: {
            send_test_msg_when_start: false,
        },
    },
    query_task: [],
    push_channel: [],
});

const toBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }

    return fallback;
};

const toStringValue = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return '';
};

const toNumberText = (value: unknown): string => {
    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        return value;
    }

    return '';
};

const toStringList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => toStringValue(item)).filter((item) => item.length > 0);
    }

    if (typeof value === 'string') {
        return value
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    return [];
};

const toNumberList = (value: string[]): number[] => {
    return value
        .map((item) => Number(item))
        .filter((item) => !Number.isNaN(item));
};

const toMixedIdList = (value: string[]): Array<string | number> => {
    return value.map((item) => {
        if (/^-?\d+$/.test(item)) {
            return Number(item);
        }

        return item;
    });
};

const toPushTargetGroups = (value: unknown): PushTargetGroupDraft[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item) => {
        const record: any = item || {};
        return {
            guild_name: toStringValue(record.guild_name),
            channel_name_list: toStringList(record.channel_name_list),
        };
    });
};

const normalizeQueryTask = (task: unknown): QueryTaskDraft => {
    const record: any = task || {};
    return {
        name: toStringValue(record.name),
        enable: toBoolean(record.enable),
        type: toStringValue(record.type) || 'bilibili',
        intervals_second: toNumberText(record.intervals_second) || '60',
        begin_time: toStringValue(record.begin_time) || '00:00',
        end_time: toStringValue(record.end_time) || '23:59',
        target_push_name_list: toStringList(record.target_push_name_list),
        enable_dynamic_check: toBoolean(record.enable_dynamic_check),
        enable_living_check: toBoolean(record.enable_living_check),
        uid_list: toStringList(record.uid_list),
        skip_forward: toBoolean(record.skip_forward),
        cookie: toStringValue(record.cookie),
        payload: toStringValue(record.payload),
        profile_id_list: toStringList(record.profile_id_list),
        signature_server_url: toStringValue(record.signature_server_url),
        username_list: toStringList(record.username_list),
        sec_uid_list: toStringList(record.sec_uid_list),
        douyin_id_list: toStringList(record.douyin_id_list),
        room_id_list: toStringList(record.room_id_list),
    };
};

const normalizePushChannel = (channel: unknown): PushChannelDraft => {
    const record: any = channel || {};
    return {
        name: toStringValue(record.name),
        enable: toBoolean(record.enable),
        type: toStringValue(record.type),
        send_key: toStringValue(record.send_key),
        uid: toStringValue(record.uid),
        tags: toStringValue(record.tags),
        corp_id: toStringValue(record.corp_id),
        agent_id: toStringValue(record.agent_id),
        corp_secret: toStringValue(record.corp_secret),
        key: toStringValue(record.key),
        access_token: toStringValue(record.access_token),
        app_id: toStringValue(record.app_id),
        app_secret: toStringValue(record.app_secret),
        receive_id_type: toStringValue(record.receive_id_type),
        receive_id: toStringValue(record.receive_id),
        webhook_key: toStringValue(record.webhook_key),
        api_token: toStringValue(record.api_token),
        chat_id: toStringValue(record.chat_id),
        base_url: toStringValue(record.base_url),
        push_target_list: toPushTargetGroups(record.push_target_list),
        api_url: toStringValue(record.api_url),
        token: toStringValue(record.token),
        user_id: toStringValue(record.user_id),
        group_id: toStringValue(record.group_id),
        at_qq: toStringValue(record.at_qq),
        server_url: toStringValue(record.server_url),
        web_server_url: toStringValue(record.web_server_url),
        webhook_url: toStringValue(record.webhook_url),
        request_method: toStringValue(record.request_method) || 'GET',
        smtp_host: toStringValue(record.smtp_host),
        smtp_port: toNumberText(record.smtp_port),
        smtp_ssl: toBoolean(record.smtp_ssl, true),
        smtp_tls: toBoolean(record.smtp_tls),
        sender_email: toStringValue(record.sender_email),
        sender_password: toStringValue(record.sender_password),
        receiver_email: toStringValue(record.receiver_email),
    };
};

const normalizeConfig = (config?: Record<string, unknown> | null): AioConfigDraft => {
    const root: any = config || {};
    const common: any = root.common || {};
    const proxyPool: any = common.proxy_pool || {};
    const pushChannel: any = common.push_channel || {};

    return {
        common: {
            proxy_pool: {
                enable: toBoolean(proxyPool.enable),
                proxy_pool_url: toStringValue(proxyPool.proxy_pool_url),
            },
            push_channel: {
                send_test_msg_when_start: toBoolean(pushChannel.send_test_msg_when_start),
            },
        },
        query_task: Array.isArray(root.query_task) ? root.query_task.map(normalizeQueryTask) : [],
        push_channel: Array.isArray(root.push_channel) ? root.push_channel.map(normalizePushChannel) : [],
    };
};

const denormalizeQueryTask = (task: QueryTaskDraft): Record<string, unknown> => {
    const result: Record<string, unknown> = {
        name: task.name,
        enable: task.enable,
        type: task.type,
        intervals_second: Number(task.intervals_second) || 0,
        begin_time: task.begin_time,
        end_time: task.end_time,
        target_push_name_list: task.target_push_name_list,
        enable_dynamic_check: task.enable_dynamic_check,
        enable_living_check: task.enable_living_check,
        skip_forward: task.skip_forward,
    };

    const typeFields: Record<string, unknown> = {};
    if (task.type === 'bilibili' || task.type === 'weibo') {
        typeFields.uid_list = toNumberList(task.uid_list);
        typeFields.cookie = task.cookie;
        typeFields.payload = task.payload;
    }
    if (task.type === 'xhs') {
        typeFields.profile_id_list = task.profile_id_list;
        typeFields.cookie = task.cookie;
    }
    if (task.type === 'douyin') {
        typeFields.signature_server_url = task.signature_server_url;
        typeFields.username_list = task.username_list;
        typeFields.sec_uid_list = task.sec_uid_list;
        typeFields.douyin_id_list = task.douyin_id_list;
    }
    if (task.type === 'douyu' || task.type === 'huya') {
        typeFields.room_id_list = toMixedIdList(task.room_id_list);
    }

    return { ...result, ...typeFields };
};

const denormalizePushChannel = (channel: PushChannelDraft): Record<string, unknown> => {
    const result: Record<string, unknown> = {
        name: channel.name,
        enable: channel.enable,
        type: channel.type,
    };

    const typeFields: Record<string, unknown> = {};
    if (channel.type === 'serverChan_turbo' || channel.type === 'serverChan_3') {
        typeFields.send_key = channel.send_key;
    }
    if (channel.type === 'serverChan_3') {
        typeFields.uid = channel.uid;
        typeFields.tags = channel.tags;
    }
    if (channel.type === 'wecom_apps') {
        typeFields.corp_id = channel.corp_id;
        typeFields.agent_id = channel.agent_id;
        typeFields.corp_secret = channel.corp_secret;
    }
    if (channel.type === 'wecom_bot') {
        typeFields.key = channel.key;
    }
    if (channel.type === 'dingtalk_bot') {
        typeFields.access_token = channel.access_token;
    }
    if (channel.type === 'feishu_apps') {
        typeFields.app_id = channel.app_id;
        typeFields.app_secret = channel.app_secret;
        typeFields.receive_id_type = channel.receive_id_type;
        typeFields.receive_id = channel.receive_id;
    }
    if (channel.type === 'feishu_bot') {
        typeFields.webhook_key = channel.webhook_key;
    }
    if (channel.type === 'telegram_bot') {
        typeFields.api_token = channel.api_token;
        typeFields.chat_id = channel.chat_id;
    }
    if (channel.type === 'qq_bot') {
        typeFields.base_url = channel.base_url;
        typeFields.app_id = channel.app_id;
        typeFields.app_secret = channel.app_secret;
        typeFields.push_target_list = channel.push_target_list.map((group) => ({
            guild_name: group.guild_name,
            channel_name_list: group.channel_name_list,
        }));
    }
    if (channel.type === 'napcat_qq') {
        typeFields.api_url = channel.api_url;
        typeFields.token = channel.token;
        typeFields.user_id = channel.user_id;
        typeFields.group_id = channel.group_id;
        typeFields.at_qq = channel.at_qq;
    }
    if (channel.type === 'bark') {
        typeFields.server_url = channel.server_url;
        typeFields.key = channel.key;
    }
    if (channel.type === 'gotify') {
        typeFields.web_server_url = channel.web_server_url;
    }
    if (channel.type === 'webhook') {
        typeFields.webhook_url = channel.webhook_url;
        typeFields.request_method = channel.request_method;
    }
    if (channel.type === 'email') {
        typeFields.smtp_host = channel.smtp_host;
        typeFields.smtp_port = Number(channel.smtp_port) || 0;
        typeFields.smtp_ssl = channel.smtp_ssl;
        typeFields.smtp_tls = channel.smtp_tls;
        typeFields.sender_email = channel.sender_email;
        typeFields.sender_password = channel.sender_password;
        typeFields.receiver_email = channel.receiver_email;
    }

    return { ...result, ...typeFields };
};

const serializeConfig = (draft: AioConfigDraft): Record<string, unknown> => {
    const enabledChannelNames = new Set(
        draft.push_channel
            .filter((channel) => channel.enable && channel.name.trim().length > 0)
            .map((channel) => channel.name.trim())
    );
    return {
        common: {
            proxy_pool: {
                enable: draft.common.proxy_pool.enable,
                proxy_pool_url: draft.common.proxy_pool.proxy_pool_url,
            },
            push_channel: {
                send_test_msg_when_start: draft.common.push_channel.send_test_msg_when_start,
            },
        },
        query_task: draft.query_task.map((task) => denormalizeQueryTask({
            ...task,
            target_push_name_list: task.target_push_name_list.filter((name) => enabledChannelNames.has(name)),
        })),
        push_channel: draft.push_channel.map(denormalizePushChannel),
    };
};

const arrayToText = (items: string[]) => items.join('\n');

type FieldProps = {
    label: string;
    hint?: string;
    children: React.ReactNode;
    wide?: boolean;
};

const Field: React.FC<FieldProps> = ({ label, hint, children, wide }) => (
    <label className={`aio-field${wide ? ' aio-field-wide' : ''}`}>
        <span className="aio-field-label">{label}</span>
        {children}
        {hint ? <span className="aio-field-hint">{hint}</span> : null}
    </label>
);

type SwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
};

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => (
    <label className="aio-switch">
        <span className={`aio-switch-track${checked ? ' is-checked' : ''}`}>
            <input
                className="aio-switch-input"
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className="aio-switch-thumb" />
        </span>
        {label ? <span className="aio-switch-label">{label}</span> : null}
    </label>
);

type ListEditorProps = {
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    hint?: string;
};

const ListEditor: React.FC<ListEditorProps> = ({ label, value, onChange, hint }) => {
    const [text, setText] = useState(arrayToText(value));

    useEffect(() => {
        setText(arrayToText(value));
    }, [value]);

    return (
        <Field label={label} hint={hint} wide>
            <textarea
                className="aio-textarea"
                value={text}
                onChange={(event) => {
                    const next = event.target.value;
                    setText(next);
                    onChange(
                        next
                            .split(/\r?\n/)
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0)
                    );
                }}
            />
        </Field>
    );
};

type ItemListEditorProps = {
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    addLabel: string;
    removeLabel: string;
    hint?: string;
};

const ItemListEditor: React.FC<ItemListEditorProps> = ({ label, value, onChange, addLabel, removeLabel, hint }) => {
    const [items, setItems] = useState<string[]>(value);

    useEffect(() => {
        setItems(value);
    }, [value]);

    const updateItems = (next: string[]) => {
        setItems(next);
        onChange(next);
    };

    return (
        <Field label={label} hint={hint} wide>
            <div className="aio-item-list">
                {items.length === 0 ? <div className="aio-empty-inline">{hint ?? '—'}</div> : null}
                {items.map((item, index) => (
                    <div className="aio-item-row" key={`${label}-${index}`}>
                        <input
                            className="aio-input"
                            value={item}
                            onChange={(event) => {
                                const next = items.slice();
                                next[index] = event.target.value;
                                updateItems(next);
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => updateItems(items.filter((_, itemIndex) => itemIndex !== index))}
                        >
                            {removeLabel}
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => updateItems([...items, ''])}
                >
                    {addLabel}
                </button>
            </div>
        </Field>
    );
};

type PushChannelSelectorProps = {
    channels: Array<{ name: string; type: string }>;
    value: string[];
    onChange: (next: string[]) => void;
    label: string;
    hint: string;
    emptyText: string;
};

const PushChannelSelector: React.FC<PushChannelSelectorProps> = ({
    channels,
    value,
    onChange,
    label,
    hint,
    emptyText,
}) => (
    <Field label={label} hint={hint} wide>
        {channels.length === 0 ? (
            <div className="aio-channel-empty">{emptyText}</div>
        ) : (
            <div className="aio-channel-options">
                {channels.map((channel) => {
                    const checked = value.includes(channel.name);
                    return (
                        <label className={`aio-channel-option${checked ? ' is-selected' : ''}`} key={channel.name}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => onChange(
                                    event.target.checked
                                        ? [...value.filter((name) => name !== channel.name), channel.name]
                                        : value.filter((name) => name !== channel.name)
                                )}
                            />
                            <span className="aio-channel-check" aria-hidden="true">{checked ? '✓' : ''}</span>
                            <span className="aio-channel-option-copy">
                                <strong>{channel.name}</strong>
                                <small>{channel.type}</small>
                            </span>
                        </label>
                    );
                })}
            </div>
        )}
    </Field>
);

const AioConfigForm: React.FC<AioConfigFormProps> = ({ config, sourcePath, botId, onUpdate }) => {
    const { t } = useI18n();
    const [draft, setDraft] = useState<AioConfigDraft>(() => normalizeConfig(config));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTaskIndex, setSelectedTaskIndex] = useState(() => (
        firstEnabledIndex(normalizeConfig(config).query_task)
    ));
    const [selectedChannelIndex, setSelectedChannelIndex] = useState(() => (
        firstEnabledIndex(normalizeConfig(config).push_channel)
    ));

    useEffect(() => {
        const nextDraft = normalizeConfig(config);
        setDraft(nextDraft);
        setSelectedTaskIndex(firstEnabledIndex(nextDraft.query_task));
        setSelectedChannelIndex(firstEnabledIndex(nextDraft.push_channel));
    }, [config]);

    const summary = useMemo(
        () => ({
            taskCount: draft.query_task.length,
            channelCount: draft.push_channel.length,
        }),
        [draft.query_task.length, draft.push_channel.length]
    );

    const enabledPushChannels = useMemo(() => {
        const uniqueChannels = new Map<string, { name: string; type: string }>();
        draft.push_channel.forEach((channel) => {
            const name = channel.name.trim();
            if (channel.enable && name.length > 0 && !uniqueChannels.has(name)) {
                uniqueChannels.set(name, { name, type: channel.type });
            }
        });
        return Array.from(uniqueChannels.values());
    }, [draft.push_channel]);

    const selectedTask = draft.query_task[selectedTaskIndex];
    const selectedChannel = draft.push_channel[selectedChannelIndex];

    const itemStatusLabel = (enabled: boolean) => (
        enabled ? t('aio.itemEnabled') : t('aio.itemDisabled')
    );

    const itemName = (name: string, fallback: string, index: number) => (
        name.trim() || `${fallback} ${index + 1}`
    );

    const updateTask = (index: number, updater: (current: QueryTaskDraft) => QueryTaskDraft) => {
        setDraft((current) => ({
            ...current,
            query_task: current.query_task.map((task, taskIndex) => (taskIndex === index ? updater(task) : task)),
        }));
    };

    const updateChannel = (index: number, updater: (current: PushChannelDraft) => PushChannelDraft) => {
        setDraft((current) => {
            const previousChannel = current.push_channel[index];
            const nextChannels = current.push_channel.map((channel, channelIndex) => (
                channelIndex === index ? updater(channel) : channel
            ));
            const nextChannel = nextChannels[index];
            const enabledNames = new Set(
                nextChannels
                    .filter((channel) => channel.enable && channel.name.trim().length > 0)
                    .map((channel) => channel.name.trim())
            );
            const previousName = previousChannel?.name.trim() ?? '';
            const nextName = nextChannel?.name.trim() ?? '';

            return {
                ...current,
                push_channel: nextChannels,
                query_task: current.query_task.map((task) => ({
                    ...task,
                    target_push_name_list: task.target_push_name_list
                        .map((name) => (
                            previousName.length > 0
                            && name === previousName
                            && nextChannel?.enable
                            && nextName.length > 0
                                ? nextName
                                : name
                        ))
                        .filter((name, itemIndex, names) => enabledNames.has(name) && names.indexOf(name) === itemIndex),
                })),
            };
        });
    };

    const addTask = () => {
        const nextIndex = draft.query_task.length;
        setDraft((current) => ({
            ...current,
            query_task: [
                ...current.query_task,
                normalizeQueryTask({ name: '', enable: false, type: 'bilibili' }),
            ],
        }));
        setSelectedTaskIndex(nextIndex);
    };

    const removeTask = (index: number) => {
        setDraft((current) => ({
            ...current,
            query_task: current.query_task.filter((_, itemIndex) => itemIndex !== index),
        }));
        setSelectedTaskIndex(Math.max(0, Math.min(index, draft.query_task.length - 2)));
    };

    const addChannel = () => {
        const nextIndex = draft.push_channel.length;
        setDraft((current) => ({
            ...current,
            push_channel: [
                ...current.push_channel,
                normalizePushChannel({ name: '', enable: false, type: 'bark' }),
            ],
        }));
        setSelectedChannelIndex(nextIndex);
    };

    const removeChannel = (index: number) => {
        setDraft((current) => {
            const removedName = current.push_channel[index]?.name.trim() ?? '';
            return {
                ...current,
                push_channel: current.push_channel.filter((_, itemIndex) => itemIndex !== index),
                query_task: current.query_task.map((task) => ({
                    ...task,
                    target_push_name_list: task.target_push_name_list.filter((name) => name !== removedName),
                })),
            };
        });
        setSelectedChannelIndex(Math.max(0, Math.min(index, draft.push_channel.length - 2)));
    };

    const handleSave = async () => {
        if (!onUpdate) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await onUpdate(serializeConfig(draft));
        } catch (err) {
            setError(t('aio.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const renderTaskSpecificFields = (task: QueryTaskDraft, index: number) => {
        switch (task.type) {
            case 'bilibili':
            case 'weibo':
                return (
                    <>
                        <ItemListEditor
                            label={t('aio.task.uidList')}
                            value={task.uid_list}
                            onChange={(next) => updateTask(index, (current) => ({ ...current, uid_list: next }))}
                            addLabel={t('aio.uidAdd')}
                            removeLabel={t('aio.remove')}
                            hint={t('aio.uidHint')}
                        />
                        <Field label={t('aio.task.cookie')} wide>
                            <textarea
                                className="aio-textarea aio-textarea-tall"
                                value={task.cookie}
                                onChange={(event) => updateTask(index, (current) => ({ ...current, cookie: event.target.value }))}
                            />
                        </Field>
                        <Field label={t('aio.task.payload')} wide>
                            <textarea
                                className="aio-textarea"
                                value={task.payload}
                                onChange={(event) => updateTask(index, (current) => ({ ...current, payload: event.target.value }))}
                            />
                        </Field>
                    </>
                );
            case 'xhs':
                return (
                    <>
                        <ListEditor
                            label={t('aio.task.profileIdList')}
                            value={task.profile_id_list}
                            onChange={(next) => updateTask(index, (current) => ({ ...current, profile_id_list: next }))}
                        />
                        <Field label={t('aio.task.cookie')} wide>
                            <textarea
                                className="aio-textarea aio-textarea-tall"
                                value={task.cookie}
                                onChange={(event) => updateTask(index, (current) => ({ ...current, cookie: event.target.value }))}
                            />
                        </Field>
                    </>
                );
            case 'douyin':
                return (
                    <>
                        <Field label={t('aio.task.signatureServerUrl')}>
                            <input
                                className="aio-input"
                                value={task.signature_server_url}
                                onChange={(event) =>
                                    updateTask(index, (current) => ({ ...current, signature_server_url: event.target.value }))
                                }
                            />
                        </Field>
                        <ListEditor
                            label={t('aio.task.usernameList')}
                            value={task.username_list}
                            onChange={(next) => updateTask(index, (current) => ({ ...current, username_list: next }))}
                        />
                        <ListEditor
                            label={t('aio.task.secUidList')}
                            value={task.sec_uid_list}
                            onChange={(next) => updateTask(index, (current) => ({ ...current, sec_uid_list: next }))}
                        />
                        <ListEditor
                            label={t('aio.task.douyinIdList')}
                            value={task.douyin_id_list}
                            onChange={(next) => updateTask(index, (current) => ({ ...current, douyin_id_list: next }))}
                        />
                    </>
                );
            case 'douyu':
            case 'huya':
                return (
                    <ListEditor
                        label={t('aio.task.roomIdList')}
                        value={task.room_id_list}
                        onChange={(next) => updateTask(index, (current) => ({ ...current, room_id_list: next }))}
                    />
                );
            default:
                return null;
        }
    };

    const renderChannelSpecificFields = (channel: PushChannelDraft, index: number) => {
        switch (channel.type) {
            case 'serverChan_turbo':
                return (
                    <Field label={t('aio.channel.sendKey')}>
                        <input
                            className="aio-input"
                            value={channel.send_key}
                            onChange={(event) => updateChannel(index, (current) => ({ ...current, send_key: event.target.value }))}
                        />
                    </Field>
                );
            case 'serverChan_3':
                return (
                    <>
                        <Field label={t('aio.channel.sendKey')}>
                            <input
                                className="aio-input"
                                value={channel.send_key}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, send_key: event.target.value }))}
                            />
                        </Field>
                        <Field label={t('aio.channel.uid')}>
                            <input
                                className="aio-input"
                                value={channel.uid}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, uid: event.target.value }))}
                            />
                        </Field>
                        <Field label={t('aio.channel.tags')}>
                            <input
                                className="aio-input"
                                value={channel.tags}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, tags: event.target.value }))}
                            />
                        </Field>
                    </>
                );
            case 'wecom_apps':
                return (
                    <>
                        <Field label={t('aio.channel.corpId')}>
                            <input
                                className="aio-input"
                                value={channel.corp_id}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, corp_id: event.target.value }))}
                            />
                        </Field>
                        <Field label={t('aio.channel.agentId')}>
                            <input
                                className="aio-input"
                                value={channel.agent_id}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, agent_id: event.target.value }))}
                            />
                        </Field>
                        <Field label={t('aio.channel.corpSecret')}>
                            <input
                                className="aio-input"
                                value={channel.corp_secret}
                                onChange={(event) => updateChannel(index, (current) => ({ ...current, corp_secret: event.target.value }))}
                            />
                        </Field>
                    </>
                );
            case 'wecom_bot':
                return (
                    <Field label={t('aio.channel.key')}>
                        <input className="aio-input" value={channel.key} onChange={(event) => updateChannel(index, (current) => ({ ...current, key: event.target.value }))} />
                    </Field>
                );
            case 'dingtalk_bot':
                return (
                    <Field label={t('aio.channel.accessToken')}>
                        <input className="aio-input" value={channel.access_token} onChange={(event) => updateChannel(index, (current) => ({ ...current, access_token: event.target.value }))} />
                    </Field>
                );
            case 'feishu_apps':
                return (
                    <>
                        <Field label={t('aio.channel.appId')}>
                            <input className="aio-input" value={channel.app_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, app_id: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.appSecret')}>
                            <input className="aio-input" value={channel.app_secret} onChange={(event) => updateChannel(index, (current) => ({ ...current, app_secret: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.receiveIdType')}>
                            <input className="aio-input" value={channel.receive_id_type} onChange={(event) => updateChannel(index, (current) => ({ ...current, receive_id_type: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.receiveId')}>
                            <input className="aio-input" value={channel.receive_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, receive_id: event.target.value }))} />
                        </Field>
                    </>
                );
            case 'feishu_bot':
                return (
                    <Field label={t('aio.channel.webhookKey')}>
                        <input className="aio-input" value={channel.webhook_key} onChange={(event) => updateChannel(index, (current) => ({ ...current, webhook_key: event.target.value }))} />
                    </Field>
                );
            case 'telegram_bot':
                return (
                    <>
                        <Field label={t('aio.channel.apiToken')}>
                            <input className="aio-input" value={channel.api_token} onChange={(event) => updateChannel(index, (current) => ({ ...current, api_token: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.chatId')}>
                            <input className="aio-input" value={channel.chat_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, chat_id: event.target.value }))} />
                        </Field>
                    </>
                );
            case 'qq_bot':
                return (
                    <>
                        <Field label={t('aio.channel.baseUrl')}>
                            <input className="aio-input" value={channel.base_url} onChange={(event) => updateChannel(index, (current) => ({ ...current, base_url: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.appId')}>
                            <input className="aio-input" value={channel.app_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, app_id: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.appSecret')}>
                            <input className="aio-input" value={channel.app_secret} onChange={(event) => updateChannel(index, (current) => ({ ...current, app_secret: event.target.value }))} />
                        </Field>
                        <div className="aio-subsection">
                            <div className="aio-subsection-header">
                                <div>
                                    <div className="section-copy">{t('aio.channel.pushTargetList')}</div>
                                    <div className="section-title" style={{ marginBottom: 0 }}>
                                        {t('aio.channel.pushTargetListHint')}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() =>
                                        updateChannel(index, (current) => ({
                                            ...current,
                                            push_target_list: [
                                                ...current.push_target_list,
                                                { guild_name: '', channel_name_list: [] },
                                            ],
                                        }))
                                    }
                                >
                                    {t('aio.addGroup')}
                                </button>
                            </div>
                            <div className="aio-stack">
                                {channel.push_target_list.map((group, groupIndex) => (
                                    <div className="aio-item-card" key={`${groupIndex}-${group.guild_name}`}>
                                        <div className="aio-item-header">
                                            <strong>
                                                {t('aio.channel.group')} {groupIndex + 1}
                                            </strong>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() =>
                                                    updateChannel(index, (current) => ({
                                                        ...current,
                                                        push_target_list: current.push_target_list.filter((_, itemIndex) => itemIndex !== groupIndex),
                                                    }))
                                                }
                                            >
                                                {t('aio.remove')}
                                            </button>
                                        </div>
                                        <div className="aio-field-grid">
                                            <Field label={t('aio.channel.guildName')}>
                                                <input
                                                    className="aio-input"
                                                    value={group.guild_name}
                                                    onChange={(event) =>
                                                        updateChannel(index, (current) => ({
                                                            ...current,
                                                            push_target_list: current.push_target_list.map((item, itemIndex) =>
                                                                itemIndex === groupIndex ? { ...item, guild_name: event.target.value } : item
                                                            ),
                                                        }))
                                                    }
                                                />
                                            </Field>
                                            <ListEditor
                                                label={t('aio.channel.channelNameList')}
                                                value={group.channel_name_list}
                                                onChange={(next) =>
                                                    updateChannel(index, (current) => ({
                                                        ...current,
                                                        push_target_list: current.push_target_list.map((item, itemIndex) =>
                                                            itemIndex === groupIndex ? { ...item, channel_name_list: next } : item
                                                        ),
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                );
            case 'napcat_qq':
                return (
                    <>
                        <Field label={t('aio.channel.apiUrl')}>
                            <input className="aio-input" value={channel.api_url} onChange={(event) => updateChannel(index, (current) => ({ ...current, api_url: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.token')}>
                            <input className="aio-input" value={channel.token} onChange={(event) => updateChannel(index, (current) => ({ ...current, token: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.userId')}>
                            <input className="aio-input" value={channel.user_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, user_id: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.groupId')}>
                            <input className="aio-input" value={channel.group_id} onChange={(event) => updateChannel(index, (current) => ({ ...current, group_id: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.atQq')}>
                            <input className="aio-input" value={channel.at_qq} onChange={(event) => updateChannel(index, (current) => ({ ...current, at_qq: event.target.value }))} />
                        </Field>
                    </>
                );
            case 'bark':
                return (
                    <>
                        <Field label={t('aio.channel.serverUrl')}>
                            <input className="aio-input" value={channel.server_url} onChange={(event) => updateChannel(index, (current) => ({ ...current, server_url: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.key')}>
                            <input className="aio-input" value={channel.key} onChange={(event) => updateChannel(index, (current) => ({ ...current, key: event.target.value }))} />
                        </Field>
                    </>
                );
            case 'gotify':
                return (
                    <Field label={t('aio.channel.webServerUrl')}>
                        <input className="aio-input" value={channel.web_server_url} onChange={(event) => updateChannel(index, (current) => ({ ...current, web_server_url: event.target.value }))} />
                    </Field>
                );
            case 'webhook':
                return (
                    <>
                        <Field label={t('aio.channel.webhookUrl')}>
                            <input className="aio-input" value={channel.webhook_url} onChange={(event) => updateChannel(index, (current) => ({ ...current, webhook_url: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.requestMethod')}>
                            <select className="aio-input" value={channel.request_method} onChange={(event) => updateChannel(index, (current) => ({ ...current, request_method: event.target.value }))}>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                            </select>
                        </Field>
                    </>
                );
            case 'email':
                return (
                    <>
                        <Field label={t('aio.channel.smtpHost')}>
                            <input className="aio-input" value={channel.smtp_host} onChange={(event) => updateChannel(index, (current) => ({ ...current, smtp_host: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.smtpPort')}>
                            <input className="aio-input" type="number" value={channel.smtp_port} onChange={(event) => updateChannel(index, (current) => ({ ...current, smtp_port: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.smtpSsl')}>
                            <Switch checked={channel.smtp_ssl} onChange={(checked) => updateChannel(index, (current) => ({ ...current, smtp_ssl: checked }))} />
                        </Field>
                        <Field label={t('aio.channel.smtpTls')}>
                            <Switch checked={channel.smtp_tls} onChange={(checked) => updateChannel(index, (current) => ({ ...current, smtp_tls: checked }))} />
                        </Field>
                        <Field label={t('aio.channel.senderEmail')}>
                            <input className="aio-input" value={channel.sender_email} onChange={(event) => updateChannel(index, (current) => ({ ...current, sender_email: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.senderPassword')}>
                            <input className="aio-input" value={channel.sender_password} onChange={(event) => updateChannel(index, (current) => ({ ...current, sender_password: event.target.value }))} />
                        </Field>
                        <Field label={t('aio.channel.receiverEmail')} wide>
                            <input className="aio-input" value={channel.receiver_email} onChange={(event) => updateChannel(index, (current) => ({ ...current, receiver_email: event.target.value }))} />
                        </Field>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="aio-config">
            <div className="section-header">
                <div>
                    <div className="section-copy">{t('aio.eyebrow')}</div>
                    <div className="section-title">
                        {botId ? `${t('aio.titleForBot')} · ${botId}` : t('aio.title')}
                    </div>
                    <div className="stat-note">
                        {sourcePath ? `${t('aio.sourcePath')}: ${sourcePath}` : t('aio.noSourcePath')}
                    </div>
                </div>
                <button className="btn btn-primary" type="button" onClick={handleSave} disabled={!onUpdate || saving}>
                    {saving ? t('aio.saving') : t('aio.save')}
                </button>
            </div>

            <div className="detail-summary">
                <div>
                    <div className="section-copy">{t('aio.summary')}</div>
                    <div className="section-title" style={{ marginBottom: 0 }}>
                        {summary.taskCount} {t('aio.tasks')} / {summary.channelCount} {t('aio.channels')}
                    </div>
                </div>
                <div className="status-pill">
                    <span className="status-dot good" />
                    {t('aio.structured')}
                </div>
            </div>

            <section className="aio-section">
                <div className="aio-section-header">
                    <div>
                        <div className="section-copy">{t('aio.common')}</div>
                        <div className="section-title" style={{ marginBottom: 0 }}>{t('aio.commonTitle')}</div>
                    </div>
                </div>
                <div className="aio-field-grid">
                    <Field label={t('aio.commonProxyEnable')}>
                        <Switch
                            checked={draft.common.proxy_pool.enable}
                            onChange={(checked) =>
                                setDraft((current) => ({
                                    ...current,
                                    common: {
                                        ...current.common,
                                        proxy_pool: {
                                            ...current.common.proxy_pool,
                                            enable: checked,
                                        },
                                    },
                                }))
                            }
                        />
                    </Field>
                    <Field label={t('aio.commonProxyUrl')} wide>
                        <input
                            className="aio-input"
                            value={draft.common.proxy_pool.proxy_pool_url}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    common: {
                                        ...current.common,
                                        proxy_pool: {
                                            ...current.common.proxy_pool,
                                            proxy_pool_url: event.target.value,
                                        },
                                    },
                                }))
                            }
                        />
                    </Field>
                    <Field label={t('aio.commonSendTest')}>
                        <Switch
                            checked={draft.common.push_channel.send_test_msg_when_start}
                            onChange={(checked) =>
                                setDraft((current) => ({
                                    ...current,
                                    common: {
                                        ...current.common,
                                        push_channel: {
                                            ...current.common.push_channel,
                                            send_test_msg_when_start: checked,
                                        },
                                    },
                                }))
                            }
                        />
                    </Field>
                </div>
            </section>

            <section className="aio-section">
                <div className="aio-section-header">
                    <div>
                        <div className="section-copy">{t('aio.tasks')}</div>
                        <div className="section-title" style={{ marginBottom: 0 }}>{t('aio.taskTitle')}</div>
                    </div>
                    <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={addTask}
                    >
                        {t('aio.addTask')}
                    </button>
                </div>

                {draft.query_task.length ? (
                    <div className="aio-entity-picker">
                        <label className="aio-field-label" htmlFor="aio-task-picker">{t('aio.selectTask')}</label>
                        <select
                            id="aio-task-picker"
                            className="aio-input aio-entity-select"
                            value={selectedTaskIndex}
                            onChange={(event) => setSelectedTaskIndex(Number(event.target.value))}
                        >
                            {draft.query_task.map((task, index) => (
                                <option key={index} value={index}>
                                    {itemName(task.name, t('aio.taskItem'), index)} · {task.type} · {itemStatusLabel(task.enable)}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : <div className="aio-empty-inline">{t('aio.noTasks')}</div>}

                {selectedTask ? (
                    <div className="aio-stack">
                        <div className="aio-item-card" key={selectedTaskIndex}>
                            <div className="aio-item-header">
                                <div className="aio-selected-item-title">
                                    <strong>{itemName(selectedTask.name, t('aio.taskItem'), selectedTaskIndex)}</strong>
                                    <span className={`aio-enable-badge ${selectedTask.enable ? 'is-enabled' : 'is-disabled'}`}>
                                        {itemStatusLabel(selectedTask.enable)}
                                    </span>
                                </div>
                                <button type="button" className="btn btn-ghost" onClick={() => removeTask(selectedTaskIndex)}>
                                    {t('aio.remove')}
                                </button>
                            </div>
                            <div className="aio-field-grid">
                                <Field label={t('aio.task.name')}>
                                    <input className="aio-input" value={selectedTask.name} onChange={(event) => updateTask(selectedTaskIndex, (current) => ({ ...current, name: event.target.value }))} />
                                </Field>
                                <Field label={t('aio.task.enable')}>
                                    <Switch checked={selectedTask.enable} onChange={(checked) => updateTask(selectedTaskIndex, (current) => ({ ...current, enable: checked }))} />
                                </Field>
                            </div>

                            {selectedTask.enable ? (
                                <div className="aio-subsection">
                                    <div className="aio-subsection-header">
                                        <div>
                                            <div className="section-copy">{t('aio.task.advanced')}</div>
                                            <div className="section-title" style={{ marginBottom: 0 }}>
                                                {selectedTask.type}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="aio-field-grid">
                                        <Field label={t('aio.task.type')}>
                                            <select className="aio-input" value={selectedTask.type} onChange={(event) => updateTask(selectedTaskIndex, (current) => ({ ...current, type: event.target.value }))}>
                                                {taskTypes.map((type) => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label={t('aio.task.intervalsSecond')}>
                                            <input className="aio-input" type="number" value={selectedTask.intervals_second} onChange={(event) => updateTask(selectedTaskIndex, (current) => ({ ...current, intervals_second: event.target.value }))} />
                                        </Field>
                                        <Field label={t('aio.task.beginTime')}>
                                            <input className="aio-input" value={selectedTask.begin_time} onChange={(event) => updateTask(selectedTaskIndex, (current) => ({ ...current, begin_time: event.target.value }))} />
                                        </Field>
                                        <Field label={t('aio.task.endTime')}>
                                            <input className="aio-input" value={selectedTask.end_time} onChange={(event) => updateTask(selectedTaskIndex, (current) => ({ ...current, end_time: event.target.value }))} />
                                        </Field>
                                        <Field label={t('aio.task.dynamicCheck')}>
                                            <Switch checked={selectedTask.enable_dynamic_check} onChange={(checked) => updateTask(selectedTaskIndex, (current) => ({ ...current, enable_dynamic_check: checked }))} />
                                        </Field>
                                        <Field label={t('aio.task.livingCheck')}>
                                            <Switch checked={selectedTask.enable_living_check} onChange={(checked) => updateTask(selectedTaskIndex, (current) => ({ ...current, enable_living_check: checked }))} />
                                        </Field>
                                        <Field label={t('aio.task.skipForward')}>
                                            <Switch checked={selectedTask.skip_forward} onChange={(checked) => updateTask(selectedTaskIndex, (current) => ({ ...current, skip_forward: checked }))} />
                                        </Field>
                                        <PushChannelSelector
                                            label={t('aio.task.targetPushNames')}
                                            channels={enabledPushChannels}
                                            value={selectedTask.target_push_name_list}
                                            onChange={(next) => updateTask(selectedTaskIndex, (current) => ({ ...current, target_push_name_list: next }))}
                                            hint={t('aio.task.targetPushHint')}
                                            emptyText={t('aio.task.noEnabledPushChannels')}
                                        />
                                    </div>
                                    <div className="aio-field-grid">{renderTaskSpecificFields(selectedTask, selectedTaskIndex)}</div>
                                </div>
                            ) : <div className="aio-collapsed-note">{t('aio.taskCollapsedHint')}</div>}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="aio-section">
                <div className="aio-section-header">
                    <div>
                        <div className="section-copy">{t('aio.channels')}</div>
                        <div className="section-title" style={{ marginBottom: 0 }}>{t('aio.channelTitle')}</div>
                    </div>
                    <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={addChannel}
                    >
                        {t('aio.addChannel')}
                    </button>
                </div>

                {draft.push_channel.length ? (
                    <div className="aio-entity-picker">
                        <label className="aio-field-label" htmlFor="aio-channel-picker">{t('aio.selectChannel')}</label>
                        <select
                            id="aio-channel-picker"
                            className="aio-input aio-entity-select"
                            value={selectedChannelIndex}
                            onChange={(event) => setSelectedChannelIndex(Number(event.target.value))}
                        >
                            {draft.push_channel.map((channel, index) => (
                                <option key={index} value={index}>
                                    {itemName(channel.name, t('aio.channelItem'), index)} · {channel.type} · {itemStatusLabel(channel.enable)}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : <div className="aio-empty-inline">{t('aio.noChannels')}</div>}

                {selectedChannel ? (
                    <div className="aio-stack">
                        <div className="aio-item-card" key={selectedChannelIndex}>
                            <div className="aio-item-header">
                                <div className="aio-selected-item-title">
                                    <strong>{itemName(selectedChannel.name, t('aio.channelItem'), selectedChannelIndex)}</strong>
                                    <span className={`aio-enable-badge ${selectedChannel.enable ? 'is-enabled' : 'is-disabled'}`}>
                                        {itemStatusLabel(selectedChannel.enable)}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => removeChannel(selectedChannelIndex)}
                                >
                                    {t('aio.remove')}
                                </button>
                            </div>

                            <div className="aio-field-grid">
                                <Field label={t('aio.channel.name')}>
                                    <input className="aio-input" value={selectedChannel.name} onChange={(event) => updateChannel(selectedChannelIndex, (current) => ({ ...current, name: event.target.value }))} />
                                </Field>
                                <Field label={t('aio.channel.enable')}>
                                    <Switch checked={selectedChannel.enable} onChange={(checked) => updateChannel(selectedChannelIndex, (current) => ({ ...current, enable: checked }))} />
                                </Field>
                                <Field label={t('aio.channel.type')}>
                                    <select className="aio-input" value={selectedChannel.type} onChange={(event) => updateChannel(selectedChannelIndex, (current) => ({ ...current, type: event.target.value }))}>
                                        {channelTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="aio-subsection">
                                <div className="aio-subsection-header">
                                    <div>
                                        <div className="section-copy">{t('aio.channel.advanced')}</div>
                                        <div className="section-title" style={{ marginBottom: 0 }}>
                                            {selectedChannel.type}
                                        </div>
                                    </div>
                                </div>
                                <div className="aio-field-grid">{renderChannelSpecificFields(selectedChannel, selectedChannelIndex)}</div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {error ? <div className="empty-state">{error}</div> : null}

            <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" type="button" onClick={handleSave} disabled={!onUpdate || saving}>
                    {saving ? t('aio.saving') : t('aio.save')}
                </button>
            </div>
        </div>
    );
};

export default AioConfigForm;
