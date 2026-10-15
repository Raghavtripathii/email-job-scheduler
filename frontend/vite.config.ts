import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // backend login redirect and cors expect exactly 5173
  server: { port: 5173, strictPort: true },
});
