import { BaseAction } from "./bases/base.action";
import { Action } from "../_decorators/action.decorator";

export type WaitForOtpActionParams = {
    /** CSS-Selektor für das OTP-Eingabefeld */
    selector: string;
    /** Optionaler Selektor, um zu prüfen ob OTP-Seite angezeigt wird */
    detectSelector?: string;
    /** Timeout in ms für die OTP-Eingabe (Standard: 120000 = 2 Minuten) */
    timeout?: number;
    /** Nach Eingabe Enter drücken */
    pressEnter?: boolean;
    /** Nachricht die dem Benutzer angezeigt wird */
    message?: string;
}

@Action('waitForOtp', {
    displayName: 'Wait for OTP',
    icon: 'KeyRound',
    description: 'Wait for user to enter an OTP code',
    color: 'orange',
    category: 'interaction'
})
export class WaitForOtpAction extends BaseAction<WaitForOtpActionParams> {

    async run(): Promise<string> {
        const {
            selector,
            detectSelector,
            timeout = 120000,
            pressEnter = true,
            message = 'Bitte gib den OTP-Code ein:'
        } = this.params;

        // Prüfe ob OTP-Seite angezeigt wird (falls detectSelector angegeben)
        if (detectSelector) {
            try {
                const otpPageDetected = await this.page.$(detectSelector);
                if (!otpPageDetected) {
                    this.logger.log('✅ Keine OTP-Seite erkannt, überspringe...');
                    return null;
                }
                this.logger.log('🔒 OTP-Seite erkannt!');
            } catch (error) {
                this.logger.debug(`OTP-Seite nicht erkannt: ${error.message}`);
                return null;
            }
        }

        // Warte auf das OTP-Eingabefeld
        try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            this.logger.log(`📝 OTP-Eingabefeld gefunden: ${selector}`);
        } catch (error) {
            this.logger.warn(`⚠️ OTP-Eingabefeld nicht gefunden: ${selector}`);
            return null;
        }

        // Fordere OTP über den ScrapeEventsService an
        let otpCode: string;

        if (this.data?.scrapeEventsService) {
            // Über Web-UI
            this.logger.log('🌐 Warte auf OTP-Eingabe über Web-UI...');
            otpCode = await this.data.scrapeEventsService.requestOtp(
                this.data.scrapeId || 'unknown',
                message,
                selector
            );
        } else {
            // Fallback: Terminal-Eingabe
            this.logger.log('⌨️ Fallback: Terminal-Eingabe');
            otpCode = await this.promptForOtpTerminal(message);
        }

        if (!otpCode) {
            this.logger.warn('⚠️ Kein OTP-Code eingegeben');
            return null;
        }

        this.logger.log(`🔑 OTP-Code eingegeben: ${'*'.repeat(otpCode.length)}`);

        // Gib den OTP-Code ein
        await this.page.type(selector, otpCode);

        // Optional: Enter drücken
        if (pressEnter) {
            await this.page.keyboard.press('Enter');
            try {
                await this.page.waitForNavigation({ timeout: 30000 });
            } catch (error) {
                this.logger.debug('Navigation nach OTP-Eingabe nicht abgewartet');
            }
        }

        this.logger.log('✅ OTP-Code erfolgreich eingegeben');
        return otpCode;
    }

    private async promptForOtpTerminal(message: string): Promise<string> {
        const readline = await import('readline');
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            this.logger.log(`🔐 ${message}`);

            rl.question('', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });
    }
}

export default WaitForOtpAction;
