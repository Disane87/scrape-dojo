import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({
  providedIn: 'root'
})
export class DateLocalizationService {
  private readonly translocoService = inject(TranslocoService);

  private getLocale(): string {
    const lang = this.translocoService.getActiveLang();
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'de': 'de-DE'
    };
    return localeMap[lang] || 'en-US';
  }

  formatDate(
    timestamp: string | number | Date,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp;

    if (isNaN(date.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    return date.toLocaleDateString(this.getLocale(), options || defaultOptions);
  }

  formatDateTime(
    timestamp: string | number | Date,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp;

    if (isNaN(date.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleString(this.getLocale(), options || defaultOptions);
  }

  formatTime(
    timestamp: string | number | Date,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!timestamp) return '';

    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
      ? new Date(timestamp)
      : timestamp;

    if (isNaN(date.getTime())) return '';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleTimeString(this.getLocale(), options || defaultOptions);
  }

  formatRelativeTime(timestamp: string | number | Date): string {
    if (!timestamp) return '';

    const now = new Date().getTime();
    const date = typeof timestamp === 'string' || typeof timestamp === 'number'
      ? new Date(timestamp).getTime()
      : timestamp.getTime();

    if (isNaN(date)) return '';

    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    const lang = this.translocoService.getActiveLang();

    if (minutes < 1) {
      return lang === 'de' ? 'gerade eben' : 'just now';
    }
    if (minutes < 60) {
      return lang === 'de' ? `vor ${minutes} Min.` : `${minutes} min ago`;
    }
    if (hours < 24) {
      return lang === 'de' ? `vor ${hours} Std.` : `${hours} hrs ago`;
    }
    if (days === 1) {
      return lang === 'de' ? 'gestern' : 'yesterday';
    }
    if (days < 7) {
      return lang === 'de' ? `vor ${days} Tagen` : `${days} days ago`;
    }

    // For older entries, show the formatted date
    return this.formatDate(date, { day: '2-digit', month: '2-digit' });
  }
}
