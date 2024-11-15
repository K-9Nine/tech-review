import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/its-api': {
        target: 'https://api.itstechnologygroup.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/its-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('ITS proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to ITS:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from ITS:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/connect/token': {
        target: 'https://id.zen.co.uk',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Zen Auth proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Set headers exactly as in example
            proxyReq.setHeader('Authorization', req.headers['authorization']);
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');

            // Remove any other headers
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            proxyReq.removeHeader('Accept');

            console.log('Sending Auth Request to Zen:', {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders()
            });
          });
        },
      },
      '/self-service/api': {
        target: 'https://gateway.api.indirect.zen.co.uk',
        changeOrigin: true,
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Zen API proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.body) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
        },
      }
    }
  }
});
