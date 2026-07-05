// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // ── Configuración de Vitest ─────────────────────────────────────────
  test: {
    // Simula un navegador real (DOM) dentro de Node
    environment: 'jsdom',

    // Ejecuta setup.js antes de cada archivo de tests
    setupFiles: ['./src/tests/setup.js'],

    // Permite usar describe/it/expect sin importarlos en cada archivo
    globals: true,

    // Cobertura de código (ejecutar con: npm run test:coverage)
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'lcov'],
      include:    ['src/**/*.{js,jsx}'],
      exclude:    [
        'src/test/**',
        'src/main.jsx',
        'src/firebase/config.js',
        'src/**/*.css',
      ],
    },
  },
});