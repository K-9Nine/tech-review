import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, 'src') }
        ]
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',  // Ensure this matches your Express server port
                changeOrigin: true,
                secure: false
            }
        }
    }
});


