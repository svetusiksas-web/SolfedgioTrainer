import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/SolfedgioTrainer/',
  build: { target: 'es2022' },
});
