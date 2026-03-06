import { KeyInput } from 'puppeteer';
import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';

// Typdefinition für die Parameter der KeyboardPressAction
export type KeyboardPressActionParams = {
  key: KeyInput; // Die Taste, die gedrückt werden soll, z.B. "Enter", "Escape", "ArrowUp", etc.
};

@Action('keyboardPress', {
  displayName: 'Keyboard Press',
  icon: 'Key',
  description: 'Press a keyboard key (Enter, Escape, etc.)',
  color: 'fuchsia',
  category: 'interaction',
})
export class KeyboardPressAction extends BaseAction<KeyboardPressActionParams> {
  async run(): Promise<void> {
    if (!this.params.key) {
      throw new Error('No key provided for KeyboardPressAction');
    }

    // Simuliere das Drücken der angegebenen Taste
    await this.page.keyboard.press(this.params.key);
    this.logger.log(`Key "${this.params.key}" pressed`);
  }
}

export default KeyboardPressAction;
