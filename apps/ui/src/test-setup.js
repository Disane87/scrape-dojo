import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

// Force reset + fresh init every time. On CI, vitest creates new document
// objects per test file, but TestBed is a singleton that retains the old
// DOCUMENT token. resetTestEnvironment clears the stale reference.
const testBed = getTestBed();
testBed.resetTestEnvironment();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Angular's auto-cleanup via globalThis.afterEach may not register in vitest.
// Manually destroy active fixtures to clean up DOM root elements, then reset
// _testModuleRef to allow configureTestingModule in the next test.
afterEach(() => {
  try {
    testBed.resetTestingModule();
  } catch {
    // Ignore cleanup errors
  }
});
