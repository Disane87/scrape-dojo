import { getTestBed } from '@angular/core/testing';
import { TestComponentRenderer } from '@angular/core/testing';
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

// Monkey-patch TestComponentRenderer to debug root element creation
const origCreateComponent = testBed.constructor.prototype.createComponent;
if (origCreateComponent && !origCreateComponent._patched) {
  testBed.constructor.prototype.createComponent = function (type) {
    const renderer = this.inject(TestComponentRenderer);
    const origInsert = renderer.insertRootElement?.bind(renderer);
    if (origInsert) {
      renderer.insertRootElement = function (rootElId) {
        origInsert(rootElId);
        const found = document.querySelector(`#${rootElId}`);
        console.log(
          `[test-setup] insertRootElement('${rootElId}') - found in document: ${!!found}, body.children: ${document.body.children.length}`,
        );
        if (!found) {
          console.log(
            `[test-setup] body.innerHTML: ${document.body.innerHTML.substring(0, 200)}`,
          );
        }
      };
    }
    return origCreateComponent.call(this, type);
  };
  testBed.constructor.prototype.createComponent._patched = true;
}

afterEach(() => {
  getTestBed()._testModuleRef = null;
});
