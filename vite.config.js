import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@api': '/src/api', // Alias for the api folder
      '@': path.resolve(__dirname, "./src"), // Add this line
    },
  },
  server: {
    proxy: {
      '/zen-api': {
        target: 'https://gateway.api.indirect.zen.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zen-api/, ''),
        secure: false,
      },
      '/connect': {
        target: 'https://id.zen.co.uk',
        changeOrigin: true,
        secure: false,
      },
      '/address-api': {
        target: 'https://api.getaddress.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/address-api/, ''),
        secure: true,
      },
      '/its-api': {
        target: 'https://api.itstechnologygroup.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/its-api/, ''),
        secure: true,
      },
    },
  },
  plugins: [react()],
});


