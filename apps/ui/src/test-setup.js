import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

const testBed = getTestBed();
testBed.resetTestEnvironment();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

afterEach(() => {
  getTestBed()._testModuleRef = null;
});
