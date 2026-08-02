const proxy = require('http-proxy-middleware');

module.exports = function configureProxy(app) {
    const target = process.env.API_PROXY_TARGET || 'http://localhost:4000';

    app.use(proxy('/api', {
        target,
        changeOrigin: true,
    }));
};
