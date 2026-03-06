import { ElementHandle } from 'puppeteer';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { getValueFromPath } from './_helpers/get-value-from-path.helper';

export type GetAllElementsActionParams = {
  selector: string;
  element: string;
};

@Action('getAll', {
  displayName: 'Get All',
  icon: 'Package',
  description: 'Get multiple element handles',
  color: 'sky',
  category: 'extraction',
})
export class GetAllElementsAction extends BaseAction<GetAllElementsActionParams> {
  async run(): Promise<ElementHandle<Element>[]> {
    const pageOrElement =
      getValueFromPath<ElementHandle<Element>>(
        this.data,
        this.params.element,
      ) || this.page;

    try {
      await pageOrElement.waitForSelector(this.params.selector);
    } catch {
      this.logger.error(`Selector ${this.params.selector} not found`);
      return [];
    }

    const elements = await pageOrElement.$$(this.params.selector);
    this.logger.log(
      `Found ${elements.length} elements for selector: ${this.params.selector}`,
    );
    return elements;
  }
}

export default GetAllElementsAction;
