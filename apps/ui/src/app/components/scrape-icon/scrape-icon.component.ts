import {
  Component,
  input,
  signal,
  computed,
  effect,
  inject,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  getIconUrl,
  isLucideIcon,
  getLucideIconName,
} from '../../utils/icon.utils';
import { ThemeService } from '../../services/theme.service';
import 'iconify-icon'; // Web Component for dynamic icon loading

@Component({
  selector: 'app-scrape-icon',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Allow iconify-icon web component
  template: `
    @if (isLucide()) {
      <iconify-icon
        [icon]="iconifyIcon()"
        [class]="lucideClass()"
        [width]="iconSize()"
        [height]="iconSize()"
      >
      </iconify-icon>
    } @else if (icon() && !showFallback()) {
      <img
        [src]="currentSrc()"
        [alt]="alt()"
        [class]="imgClass()"
        (error)="onImageError()"
      />
    } @else {
      <svg [class]="svgClass()" fill="currentColor" viewBox="0 0 16 16">
        <path
          d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"
        />
      </svg>
    }
  `,
})
export class ScrapeIconComponent {
  private themeService = inject(ThemeService);

  icon = input<string | undefined>();
  alt = input<string>('');
  imgClass = input<string>('w-5 h-5 rounded');
  svgClass = input<string>('w-4 h-4 text-dojo-text-muted');
  lucideClass = input<string>('w-5 h-5');
  strokeWidth = input<number>(2);
  /** Icon size in pixels (for iconify) */
  iconSize = input<string>('1.25em');

  showFallback = signal(false);
  private triedFallback = signal(false);

  // Check if this is a Lucide icon
  isLucide = computed(() => {
    const iconValue = this.icon();
    return iconValue ? isLucideIcon(iconValue) : false;
  });

  // Get the Iconify icon identifier (e.g., "lucide:test-tube-diagonal")
  iconifyIcon = computed(() => {
    const iconValue = this.icon();
    if (!iconValue) return '';
    // Already in format "lucide:icon-name", just return it
    if (iconValue.startsWith('lucide:')) {
      return iconValue;
    }
    // Convert PascalCase to kebab-case for lucide
    const kebabName = getLucideIconName(iconValue)
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    return `lucide:${kebabName}`;
  });

  // Reset state when icon or theme changes
  constructor() {
    effect(() => {
      this.icon(); // Track icon changes
      this.themeService.resolvedTheme(); // Track theme changes
      this.showFallback.set(false);
      this.triedFallback.set(false);
    });
  }

  currentSrc = computed(() => {
    const iconValue = this.icon();
    if (!iconValue || this.isLucide()) return '';

    // Get current theme variant
    const variant =
      this.themeService.resolvedTheme() === 'dark' ? 'dark' : 'light';

    // If we already tried fallback, use opposite variant
    if (this.triedFallback()) {
      const fallbackVariant = variant === 'dark' ? 'light' : 'dark';
      return getIconUrl(iconValue, fallbackVariant);
    }

    // Primary: current theme variant
    return getIconUrl(iconValue, variant);
  });

  onImageError() {
    const iconValue = this.icon();
    if (!iconValue) {
      this.showFallback.set(true);
      return;
    }

    if (!this.triedFallback()) {
      // Try opposite variant as fallback
      this.triedFallback.set(true);
    } else {
      // No more fallbacks, show SVG
      this.showFallback.set(true);
    }
  }
}
