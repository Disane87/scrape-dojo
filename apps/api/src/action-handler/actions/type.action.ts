import { ElementHandle } from 'puppeteer';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

export type TypeActionParams = {
  selector: string;
  text: string;
  pressEnter: boolean;
  /** Optional: Bedingung die erfüllt sein muss damit getippt wird (Handlebars-Template, z.B. "{{isDefined previousData.emailField}}") */
  condition?: string;
};

@Action('type', {
  displayName: 'Type',
  icon: 'Keyboard',
  description: 'Type text into an input field',
  color: 'pink',
  category: 'interaction',
})
export class TypeAction extends BaseAction<TypeActionParams> {
  private async findFirstUsableElement(
    selector: string,
  ): Promise<ElementHandle<Element>> {
    const handles = await this.page.$$(selector);
    if (handles.length === 0) {
      throw new Error(`No element found for selector: ${selector}`);
    }

    for (const handle of handles) {
      const isUsable = await handle.evaluate((el) => {
        const element = el as HTMLElement;
        const input = el as unknown as HTMLInputElement | HTMLTextAreaElement;

        const style = window.getComputedStyle(element);
        const hiddenByStyle =
          style.visibility === 'hidden' ||
          style.display === 'none' ||
          Number(style.opacity) === 0;

        const isDisabled = (input as any).disabled === true;
        const isReadonly = (input as any).readOnly === true;

        const rect = element.getBoundingClientRect();
        const hasSize = rect.width > 0 && rect.height > 0;

        return !hiddenByStyle && hasSize && !isDisabled && !isReadonly;
      });

      if (isUsable) {
        return handle;
      }
    }

    // Fallback: return first match, even if not ideal
    return handles[0];
  }

  private async readElementValue(
    handle: ElementHandle<Element>,
  ): Promise<string> {
    return handle.evaluate((el) => {
      const input = el as unknown as HTMLInputElement | HTMLTextAreaElement;
      return String((input as any).value ?? '');
    });
  }

  async run(): Promise<void> {
    // Prüfe optionale Bedingung
    if (this.params.condition !== undefined) {
      // Condition ist bereits durch Handlebars aufgelöst (z.B. "true" oder "false")
      const conditionMet = this.params.condition === 'true';

      if (!conditionMet) {
        this.logger.log(
          `⏭️ Skipping type action: condition not met (${this.params.condition})`,
        );
        return;
      }
      this.logger.debug(`✓ Condition met: ${this.params.condition}`);
    }

    this.logger.log(`⌨️ Typing into: ${this.params.selector}`);
    this.logger.debug(`📝 Text: "${this.params.text}"`);

    const target = await this.findFirstUsableElement(this.params.selector);
    await target.focus();
    // Clear existing content (works for input/textarea)
    await target.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');

    await target.type(this.params.text);

    // Verify value actually landed (some sites match hidden inputs first)
    const typedValue = await this.readElementValue(target);
    if (!typedValue || typedValue.length === 0) {
      this.logger.debug(
        `⚠️ Value not present after typing; falling back to direct value set + input events`,
      );
      await target.evaluate((el, value) => {
        const element = el as unknown as HTMLInputElement | HTMLTextAreaElement;

        const prototype = Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        const setter = descriptor?.set;

        if (setter) {
          setter.call(element, value);
        } else {
          (element as any).value = value;
        }

        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, this.params.text);
    }

    if (this.params.pressEnter) {
      this.logger.debug(`↵ Pressing Enter`);
      await this.page.keyboard.press('Enter');
      await this.page.waitForNavigation();
    }
  }
}

export default TypeAction;
