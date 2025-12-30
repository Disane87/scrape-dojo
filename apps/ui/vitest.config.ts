/// <reference types="vitest" />
import { defineConfig } from 'vite';
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
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'src/test-setup.ts')],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: '../../coverage/apps/ui',
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
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
