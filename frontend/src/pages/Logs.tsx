import React, { useEffect, useMemo, useState } from 'react';
import { fetchBotsStatus, fetchLogs } from '../api';
import { useI18n } from '../i18n';
import { BotStatus } from '../types';

type LogView = 'bot' | 'full';

const Logs: React.FC = () => {
    const { t, locale } = useI18n();
    const [bots, setBots] = useState<BotStatus[]>([]);
    const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [logView, setLogView] = useState<LogView>('full');
    const [loadingBots, setLoadingBots] = useState<boolean>(true);
    const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const selectedBot = useMemo(
        () => bots.find((bot) => bot.id === selectedBotId) ?? null,
        [bots, selectedBotId],
    );

    useEffect(() => {
        const loadBots = async () => {
            setError(null);
            try {
                const response = await fetchBotsStatus();
                setBots(response);
                setSelectedBotId((current) => {
                    if (current && response.some((bot) => bot.id === current)) {
                        return current;
                    }

                    return response[0]?.id ?? null;
                });
            } catch (error) {
                console.error(t('logs.errorFetch'), error);
                setError(t('logs.errorLoadBots'));
            } finally {
                setLoadingBots(false);
            }
        };

        loadBots();
    }, [t]);

    useEffect(() => {
        const loadLogs = async () => {
            if (!selectedBotId) {
                setLogs([]);
                setLoadingLogs(false);
                return;
            }

            setError(null);
            try {
                setLoadingLogs(true);
                const response = await fetchLogs(selectedBotId, locale, logView);
                setLogs(response);
            } catch (error) {
                console.error(t('logs.errorFetch'), error);
                setError(t('logs.errorLoadLogs'));
                setLogs([]);
            } finally {
                setLoadingLogs(false);
            }
        };

        loadLogs();
    }, [locale, logView, selectedBotId, t]);

    if (loadingBots) {
        return <div className="page"><div className="loading-state">{t('logs.loadingBots')}</div></div>;
    }

    if (error) {
        return <div className="page"><div className="empty-state">{error}</div></div>;
    }

    return (
        <div className="page">
            <section className="hero">
                <div className="hero-panel">
                    <span className="eyebrow">{t('logs.eyebrow')}</span>
                    <h1>{t('logs.title')}</h1>
                    <p>{t('logs.description')}</p>
                </div>
                <div className="hero-panel">
                    <div className="section-copy">{t('logs.stream')}</div>
                    <div className="section-title">{selectedBot?.name ?? selectedBotId ?? t('logs.noBotSelected')}</div>
                    <div className="muted" style={{ marginTop: 6 }}>
                        {selectedBot ? `${t('logs.currentBot')}: ${selectedBot.id}` : t('logs.noBots')}
                    </div>
                    <div style={{ marginTop: 14 }}>
                        <label className="create-bot-label" htmlFor="logs-bot-select">
                            {t('logs.selectBot')}
                        </label>
                        <select
                            id="logs-bot-select"
                            className="aio-input"
                            value={selectedBotId ?? ''}
                            onChange={(event) => setSelectedBotId(event.target.value)}
                            disabled={bots.length === 0}
                            style={{ marginTop: 8 }}
                        >
                            {bots.length === 0 && <option value="">{t('logs.noBots')}</option>}
                            {bots.map((bot) => (
                                <option key={bot.id} value={bot.id}>
                                    {bot.name} ({bot.id})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="stat-note" style={{ marginTop: 14 }}>
                        {t('logs.sampleStream')}
                    </div>
                    <div style={{ marginTop: 14 }}>
                        <div className="create-bot-label">{t('logs.logView')}</div>
                        <div className="btn-row" style={{ marginTop: 8 }}>
                            <button
                                className={`btn ${logView === 'bot' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setLogView('bot')}
                            >
                                {t('logs.botOnly')}
                            </button>
                            <button
                                className={`btn ${logView === 'full' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setLogView('full')}
                            >
                                {t('logs.fullView')}
                            </button>
                        </div>
                        <div className="stat-note">
                            {logView === 'full' ? t('logs.fullViewDesc') : t('logs.botOnlyDesc')}
                        </div>
                    </div>
                    <div className="stack" style={{ marginTop: 18 }}>
                        <div className="mini-card">
                            <h3>{t('logs.readingMode')}</h3>
                            <div className="muted">{t('logs.readingModeDesc')}</div>
                        </div>
                    </div>
                </div>
            </section>
            <div className="log-panel">
                <div className="log-panel-header">
                    <div>
                        <div className="section-title" style={{ margin: 0 }}>{t('logs.runtimeLog')}</div>
                        <div className="section-copy">{selectedBot ? `${selectedBot.name} · ${selectedBot.id}` : t('logs.noBotSelected')}</div>
                    </div>
                    <div className="status-pill">
                        <span className="status-dot good" />
                        {t('logs.streaming')}
                    </div>
                </div>
                {loadingLogs ? (
                    <div className="loading-state" style={{ minHeight: 240 }}>{t('logs.loadingLogs')}</div>
                ) : logs.length > 0 ? (
                    <ul className="terminal">
                        {logs.map((log, index) => (
                            <li key={index}>[{String(index + 1).padStart(2, '0')}] {log}</li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-state" style={{ minHeight: 240 }}>{t('logs.noLogs')}</div>
                )}
            </div>
        </div>
    );
};

export default Logs;
