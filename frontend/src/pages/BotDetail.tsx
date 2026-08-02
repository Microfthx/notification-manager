import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBotConfig, updateBotConfig, restartBot } from '../api';
import ConfigEditor from '../components/ConfigEditor';
import ConfigSnapshot from '../components/ConfigSnapshot';
import { BotConfig } from '../types';
import { useI18n } from '../i18n';

type RouteParams = {
    botId: string;
};

const BotDetail: React.FC = () => {
    const { t } = useI18n();
    const params = useParams();
    const botId = params.botId;
    const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBotConfig = async () => {
            try {
                const config = await getBotConfig(botId);
                setBotConfig(config);
            } finally {
                setLoading(false);
            }
        };

        fetchBotConfig();
    }, [botId]);

    const handleUpdateConfig = async (newConfig: Record<string, unknown>) => {
        try {
            await updateBotConfig(botId, newConfig);
            setBotConfig((prev) => (prev ? { ...prev, config: newConfig } : prev));
        } catch (error) {
            void error;
        }
    };

    const handleRestartBot = async () => {
        try {
            await restartBot(botId);
        } catch (error) {
            void error;
        }
    };

    if (loading) {
        return <div className="page"><div className="loading-state">{t('detail.loading')}</div></div>;
    }

    return (
        <div className="page">
            <section className="hero">
                <div className="hero-panel">
                    <span className="eyebrow">{t('detail.eyebrow')}</span>
                    <h1>{botConfig?.name}</h1>
                    <p>
                        {t('detail.description')}
                    </p>
                    <div className="btn-row" style={{ marginTop: 20 }}>
                        <button className="btn btn-primary" onClick={handleRestartBot}>{t('detail.restart')}</button>
                    </div>
                </div>
                <div className="hero-panel">
                    <div className="section-copy">{t('detail.currentState')}</div>
                    <div className="section-title">
                        {botConfig?.status ? t(`status.${botConfig.status}`) : t('common.unknown')}
                    </div>
                    <div className="stat-note" style={{ marginTop: 14 }}>
                        {t('detail.botId')}: {botId}
                    </div>
                    <div className="stack" style={{ marginTop: 18 }}>
                        <div className="mini-card">
                            <h3>{t('detail.whatThisPage')}</h3>
                            <ul className="checklist">
                                <li><span className="checkmark">✓</span> {t('detail.action1')}</li>
                                <li><span className="checkmark">✓</span> {t('detail.action2')}</li>
                                <li><span className="checkmark">✓</span> {t('detail.action3')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            <section className="card">
                <ConfigSnapshot config={botConfig?.config ?? null} />
                <ConfigEditor config={botConfig?.config ?? null} onUpdate={handleUpdateConfig} />
            </section>
        </div>
    );
};

export default BotDetail;
