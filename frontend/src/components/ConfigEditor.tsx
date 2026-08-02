import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

type ConfigEditorProps = {
    config?: Record<string, unknown> | null;
    onUpdate?: (config: Record<string, unknown>) => Promise<void> | void;
};

const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onUpdate }) => {
    const { t } = useI18n();
    const [value, setValue] = useState<string>('{}');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setValue(JSON.stringify(config ?? {}, null, 2));
        setLoading(false);
    }, [config]);

    const handleSave = async () => {
        try {
            if (onUpdate) {
                const parsed: Record<string, unknown> = JSON.parse(value);
                await onUpdate(parsed);
            }
        } catch (err) {
            setError(t('config.error'));
        }
    };

    if (loading) return <div className="loading-state">{t('config.loading')}</div>;
    if (error) return <div className="empty-state">{error}</div>;

    return (
        <div className="editor">
            <div className="section-header">
                <div>
                    <div className="section-copy">{t('config.inlineJson')}</div>
                    <div className="section-title">{t('config.title')}</div>
                    {!onUpdate && <div className="stat-note">{t('config.noUpdateHandler')}</div>}
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={!onUpdate}>
                    {t('config.save')}
                </button>
            </div>
            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                readOnly={!onUpdate}
            />
        </div>
    );
};

export default ConfigEditor;
