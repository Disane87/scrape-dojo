import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'scrape-dojo-language';
const DEFAULT_LANG = 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const language = this.getInitialLanguage();
    this.setLanguage(language);
  }

  private getInitialLanguage(): string {
    // 1. Check environment variable (from build or window object)
    const envLang = this.getEnvLanguage();
    if (envLang && this.isValidLanguage(envLang)) {
      return envLang;
    }

    // 2. Check localStorage
    const storedLang = this.getStoredLanguage();
    if (storedLang && this.isValidLanguage(storedLang)) {
      return storedLang;
    }

    // 3. Check browser language
    const browserLang = this.getBrowserLanguage();
    if (browserLang && this.isValidLanguage(browserLang)) {
      return browserLang;
    }

    // 4. Fall back to default
    return DEFAULT_LANG;
  }

  private getEnvLanguage(): string | null {
    // First check environment.ts
    if (environment.defaultLanguage) {
      return environment.defaultLanguage;
    }

    // Then check window object
    if (isPlatformBrowser(this.platformId)) {
      return (globalThis as any).DEFAULT_LANGUAGE || null;
    }

    return null;
  }

  private getStoredLanguage(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private getBrowserLanguage(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const browserLang = navigator.language || (navigator as any).userLanguage;
    // Extract language code (e.g., 'en' from 'en-US')
    return browserLang ? browserLang.split('-')[0] : null;
  }

  private isValidLanguage(lang: string): boolean {
    const availableLangs = this.translocoService.getAvailableLangs() as string[];
    return availableLangs.includes(lang);
  }

  setLanguage(language: string): void {
    if (!this.isValidLanguage(language)) {
      console.warn(`Language '${language}' is not available. Falling back to '${DEFAULT_LANG}'.`);
      language = DEFAULT_LANG;
    }

    this.translocoService.setActiveLang(language);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(STORAGE_KEY, language);
      } catch (error) {
        console.error('Failed to save language to localStorage:', error);
      }
    }
  }

  getLanguage(): string {
    return this.translocoService.getActiveLang();
  }

  getAvailableLanguages(): string[] {
    return this.translocoService.getAvailableLangs() as string[];
  }
}
