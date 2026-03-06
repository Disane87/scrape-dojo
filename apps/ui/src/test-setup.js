import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

const testBed = getTestBed();
try {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // Already initialized by @analogjs/vite-plugin-angular
}

// Angular registers auto-cleanup via globalThis.afterEach, but vitest
// globals may not be on globalThis. Ensure cleanup runs between tests.
if (!globalThis.afterEach) {
  globalThis.afterEach = afterEach;
  globalThis.beforeEach = beforeEach;
}

Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => {
    return {
      display: 'none',
      appearance: ['-webkit-appearance'],
    };
  },
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

try {
  Object.defineProperty(document.body.style, 'transform', {
    value: () => {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  });
} catch {
  // Property already defined in some environments
}
