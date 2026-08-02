import React from 'react';
import { BotStatus } from '../types';
import { useI18n } from '../i18n';

type BotListProps = {
    bots: BotStatus[];
    selectedBotId: string | null;
    onSelect?: (botId: string) => void;
    onRestart?: (botId: string) => Promise<void> | void;
    onStart?: (botId: string) => Promise<void> | void;
    onStop?: (botId: string) => Promise<void> | void;
    onAutoStartChange?: (botId: string, enabled: boolean) => Promise<void> | void;
    updatingAutoStartIds?: string[];
};

const BotList: React.FC<BotListProps> = ({
    bots,
    selectedBotId,
    onSelect,
    onRestart,
    onStart,
    onStop,
    onAutoStartChange,
    updatingAutoStartIds = [],
}) => {
    const { t } = useI18n();

    return (
        <div className="bot-list">
            {bots.length === 0 && <div className="empty-state">{t('dashboard.noBots')}</div>}
            {bots.map((bot) => {
                const statusClass =
                    bot.status === 'running'
                        ? 'good'
                        : bot.status === 'restarting'
                        ? 'warn'
                        : 'bad';

                return (
                    <div
                        className={`bot-row${selectedBotId === bot.id ? ' bot-row-selected' : ''}`}
                        key={bot.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect?.(bot.id)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelect?.(bot.id);
                            }
                        }}
                    >
                        <div className="bot-main">
                            <div className="bot-name">{bot.name}</div>
                            <div className="bot-meta">
                                {t('botList.bBotId')}: {bot.id}
                            </div>
                        </div>
                        <div className="status-pill">
                            <span className={`status-dot ${statusClass}`} />
                            {t(`status.${bot.status}`)}
                        </div>
                        <div className="btn-row">
                            <label className="auto-start-control" onClick={(event) => event.stopPropagation()}>
                                <span>{t('botList.autoStart')}</span>
                                <input
                                    type="checkbox"
                                    checked={bot.autoStart}
                                    disabled={updatingAutoStartIds.includes(bot.id)}
                                    onChange={(event) => onAutoStartChange?.(bot.id, event.target.checked)}
                                />
                                <span className="auto-start-switch" aria-hidden="true">
                                    <span className="auto-start-knob" />
                                </span>
                            </label>
                            <button
                                className="btn btn-ghost"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onStart?.(bot.id);
                                }}
                            >
                                {t('botList.start')}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onStop?.(bot.id);
                                }}
                            >
                                {t('botList.stop')}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onRestart?.(bot.id);
                                }}
                            >
                                {t('botList.restart')}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BotList;
