import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../services/language.service';
import 'iconify-icon';

interface Language {
  code: string;
  nameKey: string;
  flagIcon: string;
}

@Component({
  selector: 'app-language-switcher',
  imports: [CommonModule, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="language-switcher">
      <button
        class="language-button"
        [class.active]="isDropdownOpen"
        (click)="toggleDropdown()"
        [attr.aria-label]="'language.select' | transloco"
      >
        <iconify-icon
          [icon]="getCurrentLanguage().flagIcon"
          class="flag-icon"
        ></iconify-icon>
      </button>

      @if (isDropdownOpen) {
        <div class="dropdown">
          @for (lang of languages; track lang.code) {
            <button
              class="dropdown-item"
              [class.active]="lang.code === currentLanguage"
              (click)="selectLanguage(lang.code)"
            >
              <iconify-icon
                [icon]="lang.flagIcon"
                class="flag-icon"
              ></iconify-icon>
              <span class="name">{{ lang.nameKey | transloco }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .language-switcher {
        position: relative;
      }

      .language-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2rem;
        padding: 0.15rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 0.5rem;
        color: var(--color-dojo-text, #e2e8f0);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        &.active {
          background: rgba(255, 255, 255, 0.05);
        }
      }

      .flag-icon {
        width: 0.9rem;
        height: 0.9rem;
        font-size: 0.9rem;
        margin: auto;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .language-code {
        font-size: 0.75rem;
        opacity: 0.8;
      }

      .dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        min-width: 160px;
        background: var(--color-dojo-surface, #1e293b);
        border: 1px solid var(--color-dojo-border, #334155);
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        z-index: 1000;
        animation: dropdown-appear 0.15s ease;
      }

      @keyframes dropdown-appear {
        from {
          opacity: 0;
          transform: translateY(-0.5rem);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        height: 2.5rem;
        padding: 0 1rem;
        background: transparent;
        border: none;
        color: var(--color-dojo-text, #e2e8f0);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: rgba(139, 92, 246, 0.1);
        }

        &.active {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-dojo-accent, #8b5cf6);
          font-weight: 500;
        }
      }

      .name {
        flex: 1;
      }
    `,
  ],
})
export class LanguageSwitcherComponent {
  private readonly languageService = inject(LanguageService);

  protected isDropdownOpen = false;
  protected currentLanguage: string = 'en';

  protected languages: Language[] = [
    { code: 'en', nameKey: 'language.english', flagIcon: 'cif:gb' },
    { code: 'de', nameKey: 'language.german', flagIcon: 'cif:de' },
  ];

  constructor() {
    this.currentLanguage = this.languageService.getLanguage();
  }

  protected toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  protected selectLanguage(language: string): void {
    this.currentLanguage = language;
    this.languageService.setLanguage(language);
    this.isDropdownOpen = false;
  }

  protected getCurrentLanguage(): Language {
    return (
      this.languages.find((lang) => lang.code === this.currentLanguage) ||
      this.languages[0]
    );
  }
}
