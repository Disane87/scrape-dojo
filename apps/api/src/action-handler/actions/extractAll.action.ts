import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { getValueFromPath } from './_helpers/get-value-from-path.helper';
import { ElementHandle } from 'puppeteer';

export type ExtractAllParams = {
  selector: string; // Der CSS-Selektor, um die Elemente zu holen
  element: string;
  property: string;
};

@Action('extractAll', {
  displayName: 'Extract All',
  icon: 'FileOutput',
  description: 'Extract text or attributes from multiple elements',
  color: 'cyan',
  category: 'extraction',
})
export class ExtractAllAction extends BaseAction<ExtractAllParams> {
  // Verwende den params-Typ aus BaseAction ohne ihn erneut zu definieren
  async run(): Promise<string[] | null> {
    const pageOrElement =
      getValueFromPath<ElementHandle<Element>>(
        this.data,
        this.params.element,
      ) || this.page;
    let prop = this.params.property;

    if (!prop) {
      prop = 'textContent';
    }

    this.logger.debug(
      `🔍 Extracting all ${prop} from: ${this.params.selector}`,
    );

    const content = await this.page.evaluate(
      (el: HTMLElement) => el.innerHTML,
      pageOrElement,
    );

    this.logger.debug(`Content: ${content}`);

    try {
      // Hole alle Elemente für den gegebenen Selektor
      const elements = await pageOrElement.$$(this.params.selector);
      if (!elements || elements.length === 0) {
        this.logger.warn(`⚠️ No elements found: ${this.params.selector}`);
        return null;
      }

      this.logger.log(`📦 Found ${elements.length} elements`);

      // Iteriere über alle Elemente und extrahiere die angegebene Property
      const values: string[] = [];
      for (const element of elements) {
        let value: string | null = null;

        // Für data-* Attribute: verwende getAttribute
        if (prop.startsWith('data-')) {
          value = await this.page.evaluate(
            (el: HTMLElement, attr: string) => el.getAttribute(attr),
            element,
            prop,
          );
        } else {
          // Für normale Properties: verwende getProperty
          const propertyHandle = await element.getProperty(prop);
          value = (await propertyHandle.jsonValue()) as string;
        }

        if (value != null && value !== undefined) {
          const trimmedValue = String(value).trim();
          if (trimmedValue) {
            values.push(trimmedValue);
          }
        }
      }

      this.logger.log(`📤 Extracted ${values.length} values`);
      return values;
    } catch (ex) {
      this.logger.error(`❌ ExtractAll error: ${ex.message}`);
      return null;
    }
  }
}

export default ExtractAllAction;
