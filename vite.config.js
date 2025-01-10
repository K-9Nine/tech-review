import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api/address-lookup': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                secure: false
            },
            '/api/its': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                secure: false
            }
        }
    }
});


