import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

const testBed = getTestBed();
try {
  testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  console.log('[test-setup] initTestEnvironment succeeded');
} catch (e) {
  console.log('[test-setup] initTestEnvironment caught:', e.message);
}

// Debug: check if document operations work
const debugDiv = document.createElement('div');
debugDiv.setAttribute('id', 'debug-test');
document.body.appendChild(debugDiv);
const found = document.querySelector('#debug-test');
console.log('[test-setup] document.querySelector works:', !!found);
if (debugDiv.ownerDocument !== document) {
  console.log('[test-setup] WARNING: ownerDocument mismatch!');
}
document.body.removeChild(debugDiv);

afterEach(() => {
  getTestBed()._testModuleRef = null;
});
