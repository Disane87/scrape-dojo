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

// Angular's auto-cleanup (globalThis.afterEach) may not register in vitest's
// jsdom environment. Manually reset _testModuleRef between tests to allow
// configureTestingModule calls. Using resetTestingModule() would also destroy
// DOM root elements, breaking component tests in CI.
afterEach(() => {
  getTestBed()._testModuleRef = null;
});

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
