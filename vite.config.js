import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    proxy: {
      '/zen-api': {
        target: 'https://gateway.api.indirect.zen.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zen-api/, ''),
        secure: false
      },
      '/connect': {
        target: 'https://id.zen.co.uk',
        changeOrigin: true,
        secure: false
      },
      '/address-api': {
        target: 'https://api.getaddress.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/address-api/, ''),
        secure: true
      }
    }
  },
  plugins: [react()]
});
