import { Injectable } from '@nestjs/common';

const REDACTED = '***';

/**
 * Zentraler Service zum Sammeln und Redaktieren von Secret-Werten.
 *
 * Secrets werden während der Auflösung registriert und danach in
 * allen Log-Nachrichten automatisch durch '***' ersetzt, bevor
 * sie an SSE-Clients, Logdateien oder die Konsole gesendet werden.
 */
@Injectable()
export class SecretRedactionService {
  private secretValues = new Set<string>();

  /**
   * Registriert einen Secret-Wert zur Redaktion.
   * Leere oder sehr kurze Werte (< 2 Zeichen) werden ignoriert,
   * da sie zu viele false positives erzeugen würden.
   */
  registerSecret(value: string): void {
    if (value && value.length >= 2) {
      this.secretValues.add(value);
    }
  }

  /**
   * Entfernt alle registrierten Secrets (z.B. nach Scrape-Ende).
   */
  clear(): void {
    this.secretValues.clear();
  }

  /**
   * Ersetzt alle bekannten Secret-Werte in einem String durch '***'.
   */
  redact(message: string): string {
    if (this.secretValues.size === 0) {
      return message;
    }

    let result = message;
    for (const secret of this.secretValues) {
      if (result.includes(secret)) {
        result = result.replaceAll(secret, REDACTED);
      }
    }
    return result;
  }

  /**
   * Redaktiert Secret-Werte in einem Objekt (rekursiv).
   * Gibt eine Kopie mit redaktierten String-Werten zurück.
   */
  redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redact(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.redactObject(value);
      }
      return result as T;
    }

    return obj;
  }

  /**
   * Prüft ob Secrets registriert sind.
   */
  hasSecrets(): boolean {
    return this.secretValues.size > 0;
  }
}
