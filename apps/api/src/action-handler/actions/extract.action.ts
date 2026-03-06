import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { getValueFromPath } from './_helpers/get-value-from-path.helper';
import { ElementHandle } from 'puppeteer';

export type ExtractActionParams = {
  selector: string;
  element: string;
  property: string;
};

@Action('extract', {
  displayName: 'Extract',
  icon: 'FileOutput',
  description: 'Extract text or attribute from a single element',
  color: 'cyan',
  category: 'extraction',
})
export class ExtractAction extends BaseAction<ExtractActionParams> {
  // Verwende den params-Typ aus BaseAction ohne ihn erneut zu definieren
  async run(): Promise<string | null> {
    const pageOrElement =
      getValueFromPath<ElementHandle<Element>>(
        this.data,
        this.params.element,
      ) || this.page;
    let prop = this.params.property;

    if (!prop) {
      prop = 'textContent';
    }

    this.logger.debug(`🔍 Extracting ${prop} from: ${this.params.selector}`);

    try {
      const value = await pageOrElement.$(this.params.selector);
      if (!value) {
        this.logger.error(`❌ Element not found: ${this.params.selector}`);
        return null;
      }

      const property = await (await value.getProperty(prop)).jsonValue();
      if (property) {
        const result = (property as string).trim();
        const preview =
          result.length > 50 ? result.substring(0, 50) + '...' : result;
        this.logger.log(`📤 Extracted: "${preview}"`);
        return result;
      } else {
        const htmlContent = await this.page.evaluate(
          (li: HTMLElement, prop: string) => li[prop],
          pageOrElement,
          prop,
        );
        this.logger.log(`📤 Extracted (fallback): "${htmlContent}"`);
        return htmlContent;
      }
    } catch (ex) {
      this.logger.error(`❌ Extract error: ${ex.message}`);
      return null;
    }
  }
}

export default ExtractAction;
