import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { OtpAlternative } from '../../scrape/scrape-events.service';

export type WaitForOtpAlternativeParam = {
  /** Eindeutige ID, z.B. "whatsapp", "passkey" */
  id: string;
  /** Label das dem User angezeigt wird */
  label: string;
  /** CSS-Selektor des Buttons auf der Seite */
  selector: string;
  /** Iconify Icon-Name, z.B. "logos:whatsapp-icon" */
  icon?: string;
};

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
  /** Optional: Bedingung die erfüllt sein muss (Handlebars-Template, z.B. "{{hasNoValue previousData.passwordField}}") */
  condition?: string | boolean;
  /** Alternative Verifikationsmethoden (z.B. WhatsApp, Passkey) */
  alternatives?: WaitForOtpAlternativeParam[];
};

@Action('waitForOtp', {
  displayName: 'Wait for OTP',
  icon: 'KeyRound',
  description: 'Wait for user to enter an OTP code',
  color: 'orange',
  category: 'interaction',
})
export class WaitForOtpAction extends BaseAction<WaitForOtpActionParams> {
  async run(): Promise<string> {
    const {
      selector,
      detectSelector,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      timeout = 120000,
      pressEnter = true,
      message = 'Bitte gib den OTP-Code ein:',
    } = this.params;

    // Prüfe optionale Bedingung
    if (this.params.condition !== undefined) {
      const conditionMet =
        this.params.condition === true || this.params.condition === 'true';

      if (!conditionMet) {
        this.logger.log(
          `⏭️ Skipping waitForOtp: condition not met (${this.params.condition})`,
        );
        return null;
      }
      this.logger.debug(`✓ Condition met: ${this.params.condition}`);
    }

    // Prüfe ob OTP-Seite angezeigt wird (falls detectSelector angegeben).
    // Retry-Logik: Nach form-submits (z.B. Email + Enter) navigiert die Seite.
    // Während der Navigation wird der Execution-Context zerstört, was waitForSelector
    // mit einem Fehler abbricht. Wir fangen das ab und versuchen es erneut.
    if (detectSelector) {
      let detected = false;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const otpPageDetected = await this.page.waitForSelector(
            detectSelector,
            { timeout: 5000 },
          );
          if (otpPageDetected) {
            detected = true;
          }
          break;
        } catch (error) {
          const msg = (error as any).message || '';
          const isNavigationError =
            msg.includes('Execution context') ||
            msg.includes('navigat') ||
            msg.includes('detached') ||
            msg.includes('Target closed');

          if (isNavigationError && attempt < maxAttempts) {
            this.logger.debug(
              `OTP detect attempt ${attempt}/${maxAttempts} — page navigating, retrying in 1s...`,
            );
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          // Genuine timeout or last attempt — element not found
          break;
        }
      }

      if (!detected) {
        this.logger.log('✅ Keine OTP-Seite erkannt, überspringe...');
        return null;
      }
      this.logger.log('🔒 OTP-Seite erkannt!');
    }

    // Warte auf das OTP-Eingabefeld
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      this.logger.log(`📝 OTP-Eingabefeld gefunden: ${selector}`);
    } catch {
      this.logger.warn(`⚠️ OTP-Eingabefeld nicht gefunden: ${selector}`);
      return null;
    }

    // Alternative Verifikationsmethoden aus Config filtern (nur sichtbare)
    const configAlternatives = this.params.alternatives || [];
    const alternatives: OtpAlternative[] = [];
    for (const alt of configAlternatives) {
      try {
        const el = await this.page.$(alt.selector);
        if (el) {
          alternatives.push({
            id: alt.id,
            label: alt.label,
            selector: alt.selector,
            icon: alt.icon,
          });
          this.logger.debug(
            `🔘 Alternative sichtbar: ${alt.label} (${alt.selector})`,
          );
        } else {
          this.logger.debug(
            `⏭️ Alternative nicht gefunden: ${alt.label} (${alt.selector})`,
          );
        }
      } catch {
        this.logger.debug(
          `⏭️ Alternative-Selektor fehlgeschlagen: ${alt.selector}`,
        );
      }
    }
    if (alternatives.length > 0) {
      this.logger.log(
        `🔘 ${alternatives.length} alternative Verifikationsmethode(n) verfügbar: ${alternatives.map((a) => a.label).join(', ')}`,
      );
    }

    // Fordere OTP über den ScrapeEventsService an
    let otpCode: string;

    if (this.data?.scrapeEventsService) {
      // Über Web-UI
      this.logger.log('🌐 Warte auf OTP-Eingabe über Web-UI...');
      otpCode = await this.data.scrapeEventsService.requestOtp(
        this.data.scrapeId || 'unknown',
        message,
        selector,
        this.data.runId,
        this.page,
        alternatives,
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
      } catch {
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
        output: process.stdout,
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
