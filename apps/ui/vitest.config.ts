/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import * as path from 'path';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: path.resolve(__dirname, 'tsconfig.spec.json'),
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.js'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: '../../coverage/apps/ui',
      exclude: [
        'node_modules/',
        'src/test-setup.js',
        '**/*.spec.ts',
        '**/*.interface.ts',
        'src/main.ts',
      ],
    },
  },
  define: {
    'import.meta.vitest': undefined,
  },
});
