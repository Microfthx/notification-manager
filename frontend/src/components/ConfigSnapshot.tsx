import React from 'react';
import { useI18n } from '../i18n';

type ConfigSnapshotProps = {
    config?: Record<string, unknown> | null;
};

const maskCookie = (value: unknown) => {
    if (typeof value !== 'string' || value.length === 0) {
        return '—';
    }

    if (value.length <= 8) {
        return '••••••••';
    }

    return `${value.slice(0, 3)}…${value.slice(-3)}`;
};

const stringifyValue = (value: unknown) => {
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }

    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return String(value);
};

const ConfigSnapshot: React.FC<ConfigSnapshotProps> = ({ config }) => {
    const { t } = useI18n();
    const data = config ?? {};

    const fields = [
        { label: t('config.profileId'), value: stringifyValue(data.profile_id) },
        { label: t('config.cookie'), value: maskCookie(data.cookie) },
        { label: t('config.enable'), value: stringifyValue(data.enable) },
        { label: t('config.beginTime'), value: stringifyValue(data.begin_time) },
        { label: t('config.endTime'), value: stringifyValue(data.end_time) },
        { label: t('config.lenOfDeque'), value: stringifyValue(data.len_of_deque) },
        { label: t('config.enableDynamicCheck'), value: stringifyValue(data.enable_dynamic_check) },
    ];

    return (
        <div className="snapshot-block">
            <div className="section-header">
                <div>
                    <div className="section-copy">{t('config.snapshot')}</div>
                    <div className="section-title" style={{ marginBottom: 0 }}>{t('config.rawYaml')}</div>
                    <div className="stat-note">{t('config.snapshotHint')}</div>
                </div>
            </div>
            <div className="snapshot-grid">
                {fields.map((field) => (
                    <div className="snapshot-card" key={field.label}>
                        <div className="snapshot-label">{field.label}</div>
                        <div className="snapshot-value">{field.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConfigSnapshot;
