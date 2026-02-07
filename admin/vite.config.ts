import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react(), tailwindcss()],
    base: mode === 'production' ? '/admin/' : undefined,
    server: {
        port: 5173,
        // allowedHosts: true,
    },
}));
