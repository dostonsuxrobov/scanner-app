import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // Module workers allow the image worker to load ONNX Runtime on demand.
  worker: { format: 'es' },
});