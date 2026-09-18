import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    createBot,
    cancelNapCatQrLogin,
    cancelWeiboQrLogin,
    fetchAioConfig,
    fetchBotsStatus,
    fetchNapCatStatus,
    fetchWeiboSessionStatus,
    getBotConfig,
    checkNapCatStatus,
    restartBot,
    startBot,
    startNapCatQrLogin,
    startWeiboQrLogin,
    stopBot,
    syncWeiboSession,
    updateAioConfig,
    updateBotAutoStart,
} from '../api';
import BotList from '../components/BotList';
import AioConfigForm from '../components/AioConfigForm';
import { useI18n } from '../i18n';
import { BotConfig, BotStatus, NapCatStatus, WeiboSessionStatus } from '../types';

const Dashboard: React.FC = () => {
    const { t } = useI18n();
    const [bots, setBots] = useState<BotStatus[]>([]);
    const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
    const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
    const [aioConfig, setAioConfig] = useState<Record<string, unknown> | null>(null);
    const [aioConfigPath, setAioConfigPath] = useState<string>('');
    const [aioConfigError, setAioConfigError] = useState<string | null>(null);
    const [newBotName, setNewBotName] = useState<string>('');
    const [creatingBot, setCreatingBot] = useState<boolean>(false);
    const [createBotMessage, setCreateBotMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [weiboSession, setWeiboSession] = useState<WeiboSessionStatus | null>(null);
    const [syncingWeibo, setSyncingWeibo] = useState<boolean>(false);
    const [weiboSessionError, setWeiboSessionError] = useState<string | null>(null);
    const [updatingAutoStartIds, setUpdatingAutoStartIds] = useState<string[]>([]);
    const [napcat, setNapcat] = useState<NapCatStatus | null>(null);
    const [checkingNapcat, setCheckingNapcat] = useState<boolean>(false);
    const [napcatError, setNapcatError] = useState<string | null>(null);

    useEffect(() => {
        const loadBotsStatus = async () => {
            try {
                const status = await fetchBotsStatus();
                setBots(status);
                setSelectedBotId((current) => {
                    if (current && status.some((bot) => bot.id === current)) {
                        return current;
                    }

                    return status[0]?.id ?? null;
                });
            } catch (err) {
                setError(t('dashboard.errorLoadBots'));
            } finally {
                setLoading(false);
            }
        };

        loadBotsStatus();
    }, [t]);

    useEffect(() => {
        const qrState = weiboSession?.qrLogin?.state;
        if (!qrState || !['preparing', 'waiting', 'scanned'].includes(qrState)) {
            return undefined;
        }

        const timer = window.setInterval(async () => {
            try {
                const status = await fetchWeiboSessionStatus();
                setWeiboSession(status);
                if (status.qrLogin.state === 'success') {
                    setBots(await fetchBotsStatus());
                }
            } catch (err) {
                setWeiboSessionError(t('weiboSession.errorLoad'));
            }
        }, 2000);
        return () => window.clearInterval(timer);
    }, [weiboSession?.qrLogin?.state, t]);

    useEffect(() => {
        const loadWeiboSession = async () => {
            try {
                setWeiboSession(await fetchWeiboSessionStatus());
                setWeiboSessionError(null);
            } catch (err) {
                setWeiboSessionError(t('weiboSession.errorLoad'));
            }
        };

        loadWeiboSession();
        const timer = window.setInterval(loadWeiboSession, 60000);
        return () => window.clearInterval(timer);
    }, [t]);

    useEffect(() => {
        const loadNapcat = async () => {
            try {
                setNapcat(await fetchNapCatStatus());
                setNapcatError(null);
            } catch (err) {
                setNapcatError(t('napcat.errorLoad'));
            }
        };

        loadNapcat();
        const timer = window.setInterval(loadNapcat, 10000);
        return () => window.clearInterval(timer);
    }, [t]);

    useEffect(() => {
        const state = napcat?.qrLogin.state;
        if (!state || !['restarting', 'waiting', 'scanned'].includes(state)) {
            return undefined;
        }
        const timer = window.setInterval(async () => {
            try {
                setNapcat(await fetchNapCatStatus());
            } catch (err) {
                setNapcatError(t('napcat.errorLoad'));
            }
        }, 2000);
        return () => window.clearInterval(timer);
    }, [napcat?.qrLogin.state, t]);

    useEffect(() => {
        const loadAioConfig = async () => {
            if (!selectedBotId) {
                setAioConfig(null);
                setAioConfigPath('');
                setAioConfigError(null);
                return;
            }

            try {
                const response = await fetchAioConfig(selectedBotId);
                setAioConfig(response.config);
                setAioConfigPath(response.path);
                setAioConfigError(null);
            } catch (err) {
                setAioConfigError(t('aio.errorLoad'));
            }
        };

        loadAioConfig();
    }, [selectedBotId, t]);

    useEffect(() => {
        const loadSelectedBot = async () => {
            if (!selectedBotId) {
                setSelectedBot(null);
                return;
            }

            try {
                const detail = await getBotConfig(selectedBotId);
                setSelectedBot(detail);
            } catch (err) {
                setError(t('dashboard.errorLoadBots'));
            }
        };

        loadSelectedBot();
    }, [selectedBotId, t]);

    const handleSelectBot = (botId: string) => {
        setSelectedBotId(botId);
    };

    const handleRestart = async (botId: string) => {
        try {
            await restartBot(botId);
            const status = await fetchBotsStatus();
            setBots(status);
            if (selectedBotId === botId) {
                setSelectedBot(await getBotConfig(botId));
            }
        } catch (err) {
            setError(t('dashboard.errorRestartBot'));
        }
    };

    const handleStart = async (botId: string) => {
        try {
            await startBot(botId);
            const status = await fetchBotsStatus();
            setBots(status);
            if (selectedBotId === botId) {
                setSelectedBot(await getBotConfig(botId));
            }
        } catch (err) {
            setError(t('dashboard.errorRestartBot'));
        }
    };

    const handleStop = async (botId: string) => {
        try {
            await stopBot(botId);
            const status = await fetchBotsStatus();
            setBots(status);
            if (selectedBotId === botId) {
                setSelectedBot(await getBotConfig(botId));
            }
        } catch (err) {
            setError(t('dashboard.errorRestartBot'));
        }
    };

    const handleAutoStartChange = async (botId: string, enabled: boolean) => {
        setUpdatingAutoStartIds((current) => [...current, botId]);
        try {
            await updateBotAutoStart(botId, enabled);
            setBots(await fetchBotsStatus());
            if (selectedBotId === botId) {
                setSelectedBot(await getBotConfig(botId));
            }
        } catch (err) {
            setError(t('dashboard.errorAutoStart'));
        } finally {
            setUpdatingAutoStartIds((current) => current.filter((id) => id !== botId));
        }
    };

    const handleUpdateAioConfig = async (newConfig: Record<string, unknown>) => {
        if (!selectedBotId) {
            return;
        }

        const updated = await updateAioConfig(selectedBotId, newConfig);
        setAioConfig(updated.config);
        setAioConfigPath(updated.path);
        setAioConfigError(null);
    };

    const handleCreateBot = async () => {
        const trimmed = newBotName.trim();
        if (!trimmed) {
            setCreateBotMessage(t('dashboard.createBotError'));
            return;
        }

        try {
            setCreatingBot(true);
            setCreateBotMessage(null);
            await createBot({ botId: trimmed, templateName: 'bot-example' });
            const status = await fetchBotsStatus();
            setBots(status);
            setSelectedBotId(trimmed);
            setSelectedBot(await getBotConfig(trimmed));
            setNewBotName('');
            setCreateBotMessage(t('dashboard.createBotSuccess'));
        } catch (err) {
            setCreateBotMessage(t('dashboard.createBotError'));
        } finally {
            setCreatingBot(false);
        }
    };

    const handleSyncWeibo = async () => {
        try {
            setSyncingWeibo(true);
            setWeiboSessionError(null);
            setWeiboSession(await syncWeiboSession());
        } catch (err) {
            setWeiboSessionError(t('weiboSession.errorSync'));
            try {
                setWeiboSession(await fetchWeiboSessionStatus());
            } catch (statusError) {
                void statusError;
            }
        } finally {
            setSyncingWeibo(false);
        }
    };

    const handleStartQrLogin = async () => {
        try {
            setWeiboSessionError(null);
            setWeiboSession(await startWeiboQrLogin());
        } catch (err) {
            setWeiboSessionError(t('weiboSession.qrError'));
        }
    };

    const handleCancelQrLogin = async () => {
        try {
            setWeiboSession(await cancelWeiboQrLogin());
            setWeiboSessionError(null);
        } catch (err) {
            setWeiboSessionError(t('weiboSession.qrError'));
        }
    };

    const handleCheckNapcat = async () => {
        try {
            setCheckingNapcat(true);
            setNapcatError(null);
            setNapcat(await checkNapCatStatus());
        } catch (err) {
            setNapcatError(t('napcat.errorCheck'));
        } finally {
            setCheckingNapcat(false);
        }
    };

    const handleStartNapcatQrLogin = async () => {
        try {
            setNapcatError(null);
            setNapcat(await startNapCatQrLogin());
        } catch (err) {
            setNapcatError(t('napcat.qrError'));
        }
    };

    const handleCancelNapcatQrLogin = async () => {
        try {
            setNapcat(await cancelNapCatQrLogin());
            setNapcatError(null);
        } catch (err) {
            setNapcatError(t('napcat.qrError'));
        }
    };

    const formatSessionTime = (value: string | null | undefined) => (
        value ? new Date(value).toLocaleString() : t('weiboSession.never')
    );

    const qrState = weiboSession?.qrLogin?.state ?? 'idle';
    const qrActive = ['preparing', 'waiting', 'scanned'].includes(qrState);
    const napcatQrState = napcat?.qrLogin.state ?? 'idle';
    const napcatQrActive = ['restarting', 'waiting', 'scanned'].includes(napcatQrState);

    if (loading) {
        return <div className="page"><div className="loading-state">{t('common.loading')}</div></div>;
    }

    if (error) {
        return <div className="page"><div className="empty-state">{error}</div></div>;
    }

    return (
        <div className="page">
            <section className="hero">
                <div className="hero-panel">
                    <span className="eyebrow">{t('dashboard.eyebrow')}</span>
                    <h1>{t('dashboard.title')}</h1>
                    <p>{t('dashboard.description')}</p>
                    <div className="btn-row" style={{ marginTop: 20 }}>
                        <Link to="/logs" className="btn btn-primary">{t('dashboard.openLogs')}</Link>
                        <Link to={`/bot/${selectedBotId ?? 'bot-example'}`} className="btn btn-ghost">
                            {t('dashboard.viewBotDetail')}
                        </Link>
                    </div>
                </div>
                <div className="hero-panel">
                    <div className="section-header">
                        <div>
                            <div className="section-copy">{t('dashboard.liveSnapshot')}</div>
                            <div className="section-title">{t('dashboard.statusAtGlance')}</div>
                        </div>
                    </div>
                    <div className="hero-grid">
                        <div className="stat-card">
                            <div className="stat-label">{t('dashboard.botsOnline')}</div>
                            <div className="stat-value">{bots.filter((bot) => bot.status === 'running').length}</div>
                            <div className="stat-note">{t('dashboard.tracked')}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">{t('dashboard.defaultPort')}</div>
                            <div className="stat-value">10010</div>
                            <div className="stat-note">{t('dashboard.frontendEntry')}</div>
                        </div>
                    </div>
                    <div className="stack" style={{ marginTop: 16 }}>
                        <div className="mini-card">
                            <h3>{t('dashboard.quickActions')}</h3>
                            <div className="btn-row">
                                <Link to="/logs" className="btn btn-ghost">{t('dashboard.tailLogs')}</Link>
                                <Link to={`/bot/${selectedBotId ?? 'bot-example'}`} className="btn btn-primary">
                                    {t('dashboard.openBotDetail')}
                                </Link>
                            </div>
                        </div>
                        <div className="mini-card">
                            <h3>{t('dashboard.systemChecklist')}</h3>
                            <ul className="checklist">
                                <li><span className="checkmark">✓</span> {t('dashboard.check1')}</li>
                                <li><span className="checkmark">✓</span> {t('dashboard.check2')}</li>
                                <li><span className="checkmark">✓</span> {t('dashboard.check3')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card napcat-card">
                <div className="section-header">
                    <div>
                        <div className="section-copy">{t('napcat.eyebrow')}</div>
                        <div className="section-title">{t('napcat.title')}</div>
                        <div className="stat-note">{t('napcat.description')}</div>
                    </div>
                    <div className="status-pill">
                        <span className={`status-dot ${napcat?.state === 'online' ? 'good' : napcat?.state === 'checking' ? 'warn' : 'bad'}`} />
                        {t(`napcat.state.${napcat?.state ?? 'checking'}`)}
                    </div>
                </div>
                <div className="napcat-status-grid">
                    <div className="mini-card napcat-identity">
                        <div className="napcat-avatar" aria-hidden="true">QQ</div>
                        <div>
                            <h3>{napcat?.nickname || t('common.unknown')}</h3>
                            <div className="muted">{napcat?.accountId || t('napcat.accountUnknown')}</div>
                            <div className="stat-note">NapCat {napcat?.version || '-'}</div>
                        </div>
                    </div>
                    <div className="mini-card">
                        <h3>{t('napcat.lastOnline')}</h3>
                        <div className="muted">{formatSessionTime(napcat?.lastOnlineAt)}</div>
                        <div className="stat-note">{t('napcat.failedChecks')}: {napcat?.consecutiveFailures ?? 0}</div>
                    </div>
                </div>
                <div className="mini-card" style={{ marginTop: 14 }}>
                    <div className="section-header">
                        <div>
                            <h3>{t('napcat.deliveryStatus')}</h3>
                            <div className="muted">{napcat?.message ?? t('napcat.waiting')}</div>
                            {napcatError ? <div className="stat-note napcat-error-copy">{napcatError}</div> : null}
                        </div>
                        <div className="btn-row">
                            <button className="btn btn-ghost" type="button" onClick={handleCheckNapcat} disabled={checkingNapcat || napcatQrActive}>
                                {checkingNapcat ? t('napcat.checking') : t('napcat.checkNow')}
                            </button>
                            <button className="btn btn-primary" type="button" onClick={handleStartNapcatQrLogin} disabled={napcatQrActive || napcat?.online === true}>
                                {t('napcat.qrStart')}
                            </button>
                        </div>
                    </div>
                </div>
                {napcatQrState !== 'idle' ? (
                    <div className={`weibo-qr-panel napcat-qr-panel weibo-qr-${napcatQrState}`}>
                        <div className="weibo-qr-copy">
                            <div className="section-copy">{t('napcat.qrEyebrow')}</div>
                            <h3>{t(`napcat.qrState.${napcatQrState}`)}</h3>
                            <p className="muted">{napcat?.qrLogin.message}</p>
                            {napcat?.qrLogin.expiresAt ? (
                                <div className="stat-note">{t('napcat.qrExpires')}: {formatSessionTime(napcat.qrLogin.expiresAt)}</div>
                            ) : null}
                            {napcatQrActive ? (
                                <button className="btn btn-ghost" type="button" onClick={handleCancelNapcatQrLogin}>{t('napcat.qrCancel')}</button>
                            ) : napcat?.online ? null : (
                                <button className="btn btn-primary" type="button" onClick={handleStartNapcatQrLogin}>{t('napcat.qrRetry')}</button>
                            )}
                        </div>
                        {napcat?.qrLogin.imageDataUrl ? (
                            <div className="weibo-qr-frame"><img src={napcat.qrLogin.imageDataUrl} alt={t('napcat.qrAlt')} /></div>
                        ) : (
                            <div className="weibo-qr-placeholder">{t(`napcat.qrState.${napcatQrState}`)}</div>
                        )}
                    </div>
                ) : null}
            </section>

            <section className="card">
                <div className="section-header">
                    <div>
                        <div className="section-copy">{t('weiboSession.eyebrow')}</div>
                        <div className="section-title">{t('weiboSession.title')}</div>
                        <div className="stat-note">{t('weiboSession.description')}</div>
                    </div>
                    <div className="status-pill">
                        <span className={`status-dot ${weiboSession?.state === 'authenticated' ? 'good' : weiboSession?.state === 'checking' ? 'warn' : 'bad'}`} />
                        {t(`weiboSession.state.${weiboSession?.state ?? 'idle'}`)}
                    </div>
                </div>
                <div className="hero-grid">
                    <div className="mini-card">
                        <h3>{t('weiboSession.lastCheck')}</h3>
                        <div className="muted">{formatSessionTime(weiboSession?.lastCheckAt)}</div>
                    </div>
                    <div className="mini-card">
                        <h3>{t('weiboSession.nextCheck')}</h3>
                        <div className="muted">{formatSessionTime(weiboSession?.nextCheckAt)}</div>
                    </div>
                </div>
                <div className="mini-card" style={{ marginTop: 14 }}>
                    <div className="section-header">
                        <div>
                            <h3>{t('weiboSession.result')}</h3>
                            <div className="muted">{weiboSession?.message ?? t('weiboSession.waiting')}</div>
                            {weiboSession?.updatedBotIds.length ? (
                                <div className="stat-note">
                                    {t('weiboSession.updatedBots')}: {weiboSession.updatedBotIds.join(', ')}
                                </div>
                            ) : null}
                            {weiboSessionError ? <div className="stat-note">{weiboSessionError}</div> : null}
                        </div>
                        <div className="btn-row">
                            <button className="btn btn-ghost" type="button" onClick={handleSyncWeibo} disabled={syncingWeibo || qrActive}>
                                {syncingWeibo ? t('weiboSession.syncing') : t('weiboSession.syncNow')}
                            </button>
                            <button className="btn btn-primary" type="button" onClick={handleStartQrLogin} disabled={qrActive || syncingWeibo}>
                                {t('weiboSession.qrStart')}
                            </button>
                        </div>
                    </div>
                </div>
                {qrState !== 'idle' ? (
                    <div className={`weibo-qr-panel weibo-qr-${qrState}`}>
                        <div className="weibo-qr-copy">
                            <div className="section-copy">{t('weiboSession.qrEyebrow')}</div>
                            <h3>{t(`weiboSession.qrState.${qrState}`)}</h3>
                            <p className="muted">{weiboSession?.qrLogin.message}</p>
                            {weiboSession?.qrLogin.expiresAt ? (
                                <div className="stat-note">
                                    {t('weiboSession.qrExpires')}: {formatSessionTime(weiboSession.qrLogin.expiresAt)}
                                </div>
                            ) : null}
                            {qrActive ? (
                                <button className="btn btn-ghost" type="button" onClick={handleCancelQrLogin}>
                                    {t('weiboSession.qrCancel')}
                                </button>
                            ) : (
                                <button className="btn btn-primary" type="button" onClick={handleStartQrLogin}>
                                    {t('weiboSession.qrRetry')}
                                </button>
                            )}
                        </div>
                        {weiboSession?.qrLogin.imageDataUrl ? (
                            <div className="weibo-qr-frame">
                                <img src={weiboSession.qrLogin.imageDataUrl} alt={t('weiboSession.qrAlt')} />
                            </div>
                        ) : (
                            <div className="weibo-qr-placeholder">{qrState === 'preparing' ? t('weiboSession.qrPreparing') : t(`weiboSession.qrState.${qrState}`)}</div>
                        )}
                    </div>
                ) : null}
            </section>

            <section className="card">
                <div className="section-header">
                    <div>
                        <div className="section-copy">{t('dashboard.botFleet')}</div>
                        <div className="section-title">{t('dashboard.botList')}</div>
                    </div>
                    <div className="status-pill">
                        <span className="status-dot good" />
                        {selectedBotId ? `${t('dashboard.ready')} · ${selectedBotId}` : t('dashboard.ready')}
                    </div>
                </div>
                <div className="mini-card create-bot" style={{ marginBottom: 14 }}>
                    <h3>{t('dashboard.createBot')}</h3>
                    <div className="create-bot-form">
                        <label className="create-bot-field">
                            <span className="create-bot-label">{t('dashboard.newBotName')}</span>
                            <input
                                className="create-bot-input"
                                value={newBotName}
                                onChange={(event) => setNewBotName(event.target.value)}
                                placeholder="bot-new"
                            />
                        </label>
                        <label className="create-bot-field">
                            <span className="create-bot-label">{t('dashboard.newBotTemplate')}</span>
                            <input className="create-bot-input" value={t('dashboard.templateExample')} readOnly />
                        </label>
                        <button className="btn btn-primary" type="button" onClick={handleCreateBot} disabled={creatingBot}>
                            {creatingBot ? t('dashboard.creatingBot') : t('dashboard.createBotAction')}
                        </button>
                    </div>
                    <div className="stat-note">{t('dashboard.newBotHint')}</div>
                    {createBotMessage ? <div className="stat-note">{createBotMessage}</div> : null}
                </div>
                <BotList
                    bots={bots}
                    selectedBotId={selectedBotId}
                    onSelect={handleSelectBot}
                    onStart={handleStart}
                    onStop={handleStop}
                    onRestart={handleRestart}
                    onAutoStartChange={handleAutoStartChange}
                    updatingAutoStartIds={updatingAutoStartIds}
                />
            </section>

            <section className="card">
                <div className="section-header">
                    <div>
                        <div className="section-copy">{t('dashboard.configuration')}</div>
                        <div className="section-title">{t('aio.title')}</div>
                        <div className="stat-note">
                            {selectedBotId ? `${t('detail.botId')}: ${selectedBotId}` : t('common.unknown')}
                        </div>
                    </div>
                </div>
                {aioConfigError ? <div className="empty-state" style={{ minHeight: 120 }}>{aioConfigError}</div> : null}
                <AioConfigForm
                    config={aioConfig}
                    sourcePath={aioConfigPath}
                    botId={selectedBotId}
                    onUpdate={handleUpdateAioConfig}
                />
            </section>
        </div>
    );
};

export default Dashboard;
