import {
  Component,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';
import { ThemeService, Theme } from '../../../services/theme.service';
import { NotificationService } from '../../../services/notification.service';
import { LanguageService } from '../../../services/language.service';
import 'iconify-icon';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
        @if (authService.isAuthenticated()) {
            <details #menu class="relative">
                <summary
                    class="list-none cursor-pointer select-none rounded-xl p-1 hover:bg-dojo-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 transition"
                    aria-label="{{ 'common.user_menu' | transloco }}"
                >
                    <span class="sr-only">{{ 'common.user_menu' | transloco }}</span>
                    @if (authService.user()?.avatarUrl) {
                        <img
                            class="h-9 w-9 rounded-full object-cover ring-1 ring-dojo-border"
                            [src]="authService.user()?.avatarUrl"
                            alt="{{ 'common.avatar' | transloco }}"
                        />
                    } @else {
                        <span
                            class="h-9 w-9 rounded-full bg-linear-to-br from-orange-500 to-red-500 text-white flex items-center justify-center font-semibold text-sm ring-1 ring-orange-500/20"
                        >
                            {{ getInitials() }}
                        </span>
                    }
                </summary>

                <div
                    class="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-dojo-surface backdrop-blur-xl border border-dojo-border shadow-2xl shadow-black/50 p-2 z-50"
                    (click)="$event.stopPropagation()"
                >
                    <div class="px-3 py-2">
                        <div class="text-sm font-semibold text-dojo-text truncate">{{ authService.displayName() }}</div>
                        <div class="text-xs text-dojo-text-muted truncate">{{ authService.user()?.email }}</div>
                    </div>

                    <div class="h-px bg-dojo-border my-1"></div>

                    <!-- Settings -->
                    <div class="px-3 py-2">
                        <div class="text-[11px] font-semibold tracking-wide text-dojo-text-subtle uppercase">{{ 'common.settings' | transloco }}</div>
                    </div>

                    <!-- Language (compact select) -->
                    <div class="px-3 py-2 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 text-sm text-dojo-text">
                            <iconify-icon icon="mdi:translate" class="text-lg text-dojo-accent"></iconify-icon>
                            <span>{{ 'language.select' | transloco }}</span>
                        </div>
                        <select
                            class="h-8 rounded-lg bg-dojo-surface-2 border border-dojo-border text-dojo-text text-sm px-2
                                   focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40"
                            [value]="currentLanguage()"
                            (change)="onLanguageChange($event)"
                            aria-label="{{ 'language.select' | transloco }}"
                        >
                            <option value="de">DE</option>
                            <option value="en">EN</option>
                        </select>
                    </div>

                    <!-- Theme (segmented control) -->
                    <div class="px-3 py-2 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 text-sm text-dojo-text">
                            <iconify-icon icon="mdi:palette-outline" class="text-lg text-dojo-accent"></iconify-icon>
                            <span>{{ 'common.theme' | transloco }}</span>
                        </div>
                        <div class="inline-flex rounded-lg border border-dojo-border bg-dojo-surface-2 p-0.5">
                            <button
                                type="button"
                                (click)="setTheme('light')"
                                class="h-7 w-8 grid place-items-center rounded-md transition"
                                [class.bg-orange-500/15]="currentTheme() === 'light'"
                                [class.text-dojo-accent]="currentTheme() === 'light'"
                                [class.text-dojo-text-muted]="currentTheme() !== 'light'"
                                aria-label="{{ 'common.theme_light' | transloco }}"
                            >
                                <iconify-icon icon="mdi:white-balance-sunny" class="text-lg"></iconify-icon>
                            </button>
                            <button
                                type="button"
                                (click)="setTheme('dark')"
                                class="h-7 w-8 grid place-items-center rounded-md transition"
                                [class.bg-orange-500/15]="currentTheme() === 'dark'"
                                [class.text-dojo-accent]="currentTheme() === 'dark'"
                                [class.text-dojo-text-muted]="currentTheme() !== 'dark'"
                                aria-label="{{ 'common.theme_dark' | transloco }}"
                            >
                                <iconify-icon icon="mdi:moon-waning-crescent" class="text-lg"></iconify-icon>
                            </button>
                            <button
                                type="button"
                                (click)="setTheme('system')"
                                class="h-7 w-8 grid place-items-center rounded-md transition"
                                [class.bg-orange-500/15]="currentTheme() === 'system'"
                                [class.text-dojo-accent]="currentTheme() === 'system'"
                                [class.text-dojo-text-muted]="currentTheme() !== 'system'"
                                aria-label="{{ 'common.theme_system' | transloco }}"
                            >
                                <iconify-icon icon="mdi:monitor" class="text-lg"></iconify-icon>
                            </button>
                        </div>
                    </div>

                    <!-- Notifications (switch) -->
                    @if (notificationsSupported()) {
                        <div class="px-3 py-2 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3 text-sm text-dojo-text">
                                <iconify-icon icon="mdi:bell-outline" class="text-lg text-dojo-accent"></iconify-icon>
                                <span>{{ 'common.notifications' | transloco }}</span>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                [attr.aria-checked]="notificationsEnabled()"
                                (click)="toggleNotifications()"
                                class="relative inline-flex h-6 w-11 items-center rounded-full border transition"
                                [class.bg-orange-500/25]="notificationsEnabled()"
                                [class.border-orange-500/30]="notificationsEnabled()"
                                [class.bg-dojo-surface-2]="!notificationsEnabled()"
                                [class.border-dojo-border]="!notificationsEnabled()"
                            >
                                <span
                                    class="inline-block h-5 w-5 transform rounded-full bg-dojo-bg ring-1 ring-dojo-border shadow transition"
                                    [class.translate-x-5]="notificationsEnabled()"
                                    [class.translate-x-0.5]="!notificationsEnabled()"
                                ></span>
                            </button>
                        </div>
                    }

                    <div class="h-px bg-dojo-border my-1"></div>

                    <!-- Links / Tools -->
                    <button
                        type="button"
                        (click)="openStatus()"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:heart-pulse" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'common.status' | transloco }}</span>
                    </button>

                    <button
                        type="button"
                        (click)="openApiDocs()"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:book-open-page-variant" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'common.api_docs' | transloco }}</span>
                    </button>

                    <a
                        [href]="docsUrl()"
                        target="_blank"
                        rel="noopener noreferrer"
                        (click)="closeMenu()"
                        class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:book-open-variant" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'common.docs' | transloco }}</span>
                    </a>

                    <a
                        href="https://github.com/disane87/scrape-dojo"
                        target="_blank"
                        rel="noopener noreferrer"
                        (click)="closeMenu()"
                        class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:github" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'common.github' | transloco }}</span>
                    </a>

                    <button
                        type="button"
                        (click)="openChangelog()"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:text-box-outline" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'common.changelog' | transloco }}</span>
                    </button>

                    <div class="h-px bg-dojo-border my-1"></div>

                    @if (authService.isAdmin()) {
                        <a
                            routerLink="/admin/users"
                            (click)="closeMenu()"
                            class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                        >
                            <iconify-icon icon="mdi:account-group" class="text-lg text-dojo-accent"></iconify-icon>
                            <span>{{ 'auth.menu.users' | transloco }}</span>
                        </a>
                        <div class="h-px bg-dojo-border my-1"></div>
                    }

                    <button
                        type="button"
                        (click)="openSettings()"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-text hover:bg-dojo-surface-2 transition"
                    >
                        <iconify-icon icon="mdi:cog" class="text-lg text-dojo-accent"></iconify-icon>
                        <span>{{ 'auth.menu.settings' | transloco }}</span>
                    </button>

                    <div class="h-px bg-dojo-border my-1"></div>

                    <button
                        type="button"
                        (click)="logout()"
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-dojo-danger hover:text-dojo-danger-strong hover:bg-red-500/15 dark:hover:bg-red-500/10 transition"
                    >
                        <iconify-icon icon="mdi:logout" class="text-lg text-dojo-danger"></iconify-icon>
                        <span>{{ 'auth.menu.logout' | transloco }}</span>
                    </button>
                </div>
            </details>
        } @else {
            <a
                routerLink="/login"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dojo-border bg-dojo-surface hover:bg-dojo-surface-2 text-dojo-text transition"
            >
                <iconify-icon icon="mdi:login" class="text-lg text-dojo-accent"></iconify-icon>
                <span class="text-sm font-medium">{{ 'auth.menu.login' | transloco }}</span>
            </a>
        }
    `,
})
export class UserMenuComponent {
  authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private languageService = inject(LanguageService);

  showApiDocs = output<void>();
  showStatus = output<void>();
  showSettings = output<void>();
  showChangelog = output<void>();

  private readonly menu = viewChild<ElementRef<HTMLDetailsElement>>('menu');

  notificationsSupported = signal(this.notificationService.isSupported());
  notificationsEnabled = signal(this.notificationService.isEnabled());
  currentLanguage = signal(this.languageService.getLanguage());

  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value;
    if (value === 'de' || value === 'en') {
      this.setLanguage(value);
    }
  }

  currentTheme(): Theme {
    return this.themeService.theme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  getInitials(): string {
    const user = this.authService.user();
    if (!user) return '?';

    const name = user.displayName || user.username || user.email;
    const parts = name.split(/[\s@]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.closeMenu();
    this.authService.logout();
  }

  openStatus(): void {
    this.closeMenu();
    this.showStatus.emit();
  }

  openApiDocs(): void {
    this.closeMenu();
    this.showApiDocs.emit();
  }

  openSettings(): void {
    this.closeMenu();
    this.showSettings.emit();
  }

  openChangelog(): void {
    this.closeMenu();
    this.showChangelog.emit();
  }

  docsUrl(): string {
    const lang = this.currentLanguage();
    return `https://scrape-dojo.com/${lang}/user-guide/`;
  }

  cycleTheme(): void {
    this.themeService.cycleTheme();
  }

  themeIcon(): string {
    const theme = this.themeService.theme();
    if (theme === 'light') return 'mdi:white-balance-sunny';
    if (theme === 'dark') return 'mdi:moon-waning-crescent';
    return 'mdi:monitor';
  }

  themeLabelKey(): string {
    const theme = this.themeService.theme();
    if (theme === 'light') return 'common.theme_light';
    if (theme === 'dark') return 'common.theme_dark';
    return 'common.theme_system';
  }

  toggleNotifications(): void {
    const next = !this.notificationsEnabled();
    this.notificationsEnabled.set(next);
    this.notificationService.setEnabled(next);
    if (next) {
      this.notificationService.requestPermission();
    }
  }

  setLanguage(lang: string): void {
    this.languageService.setLanguage(lang);
    this.currentLanguage.set(lang);
  }

  closeMenu(): void {
    const el = this.menu()?.nativeElement;
    if (el && el.open) {
      el.open = false;
    }
  }
}
