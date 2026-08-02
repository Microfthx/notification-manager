import React from 'react';
import { BrowserRouter as Router, NavLink, Route, Switch } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import BotDetail from './pages/BotDetail';
import Logs from './pages/Logs';
import { I18nProvider, useI18n } from './i18n';

const App: React.FC = () => {
    return (
        <I18nProvider>
            <Router>
                <Shell />
            </Router>
        </I18nProvider>
    );
};

const Shell: React.FC = () => {
    const { locale, toggleLocale, t } = useI18n();

    return (
        <div className="app-shell">
            <header className="topbar">
                <div className="topbar-inner">
                    <div className="brand">
                        <div className="brand-mark" />
                        <div>
                            <div className="brand-title">{t('app.brandTitle')}</div>
                            <div className="brand-subtitle">{t('app.brandSubtitle')}</div>
                        </div>
                    </div>
                    <div className="nav-shell">
                        <nav className="nav">
                            <NavLink exact to="/" className="nav-link" activeClassName="active">
                                {t('app.dashboard')}
                            </NavLink>
                            <NavLink to="/logs" className="nav-link" activeClassName="active">
                                {t('app.logs')}
                            </NavLink>
                        </nav>
                        <button className="lang-switch" onClick={toggleLocale} type="button">
                            <span className="lang-label">{t('app.language')}</span>
                            <span className="lang-value">{locale === 'en' ? t('app.chinese') : t('app.english')}</span>
                        </button>
                    </div>
                </div>
            </header>
            <main>
                <Switch>
                    <Route path="/" exact component={Dashboard} />
                    <Route path="/bot/:id" component={BotDetail} />
                    <Route path="/logs" component={Logs} />
                </Switch>
            </main>
        </div>
    );
};

export default App;
