import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

const testBed = getTestBed();
try {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // Already initialized
}

// Reset _testModuleRef between tests to allow configureTestingModule.
// Angular's auto-cleanup via globalThis.afterEach doesn't register in
// vitest's jsdom environment.
afterEach(() => {
  getTestBed()._testModuleRef = null;
});
