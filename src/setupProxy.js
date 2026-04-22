const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/ai',
    createProxyMiddleware({
      target: 'https://www.applyhome.co.kr',
      changeOrigin: true,
      headers: {
        'Referer': 'https://www.applyhome.co.kr/ai/aib/selectSubscrptCalenderView.do',
        'Origin': 'https://www.applyhome.co.kr'
      }
    })
  );

  app.use(
    '/ai/aia',
    createProxyMiddleware({
      target: 'https://www.applyhome.co.kr',
      changeOrigin: true,
      headers: {
        'Referer': 'https://www.applyhome.co.kr/ai/aib/selectSubscrptCalenderView.do',
        'Origin': 'https://www.applyhome.co.kr',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  );
};
