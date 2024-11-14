import { KeyInput, Page } from "puppeteer";
import { Action } from "../decorators/action.decorator";
import { BaseAction } from "./bases/base.action";
import { PreviousData } from "../types/previous-data.type";

// Typdefinition für die Parameter der KeyboardPressAction
export type KeyboardPressActionParams = {
    key: KeyInput; // Die Taste, die gedrückt werden soll, z.B. "Enter", "Escape", "ArrowUp", etc.
}

@Action('keyboardPress')
export class KeyboardPressAction extends BaseAction<KeyboardPressActionParams> {

    async run(previousData: PreviousData): Promise<void> {
        if (!this.params.key) {
            throw new Error('No key provided for KeyboardPressAction');
        }

        // Simuliere das Drücken der angegebenen Taste
        await this.page.keyboard.press(this.params.key);
        this.logger.log(`Key "${this.params.key}" pressed`);
    }
}

export default KeyboardPressAction;
