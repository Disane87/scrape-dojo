/// <reference types="vitest" />
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, '../../apps/api/src'),
      test: resolve(__dirname, './'),
      '@scrape-dojo/shared': resolve(__dirname, '../../libs/shared/src/index.ts'),
    },
  },
});
