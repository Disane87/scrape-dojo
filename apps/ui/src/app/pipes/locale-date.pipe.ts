import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full';

@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: false,
})
export class LocaleDatePipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);

  transform(
    value: string | number | Date | null | undefined,
    format: DateFormatStyle = 'medium',
    includeTime: boolean = false,
  ): string {
    if (!value) {
      return '';
    }

    const date =
      typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : value;

    if (isNaN(date.getTime())) {
      return '';
    }

    const locale = this.getLocale();

    if (includeTime) {
      return this.formatDateTime(date, format, locale);
    } else {
      return this.formatDate(date, format, locale);
    }
  }

  private getLocale(): string {
    const lang = this.translocoService.getActiveLang();
    // Map language codes to full locale strings
    const localeMap: Record<string, string> = {
      en: 'en-US',
      de: 'de-DE',
    };
    return localeMap[lang] || 'en-US';
  }

  private formatDate(
    date: Date,
    style: DateFormatStyle,
    locale: string,
  ): string {
    const options: Intl.DateTimeFormatOptions = this.getDateOptions(style);
    return date.toLocaleDateString(locale, options);
  }

  private formatDateTime(
    date: Date,
    style: DateFormatStyle,
    locale: string,
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      ...this.getDateOptions(style),
      ...this.getTimeOptions(style),
    };
    return date.toLocaleString(locale, options);
  }

  private getDateOptions(style: DateFormatStyle): Intl.DateTimeFormatOptions {
    switch (style) {
      case 'short':
        return { day: '2-digit', month: '2-digit', year: 'numeric' };
      case 'medium':
        return { day: '2-digit', month: 'short', year: 'numeric' };
      case 'long':
        return { day: '2-digit', month: 'long', year: 'numeric' };
      case 'full':
        return {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        };
      default:
        return { day: '2-digit', month: 'short', year: 'numeric' };
    }
  }

  private getTimeOptions(style: DateFormatStyle): Intl.DateTimeFormatOptions {
    switch (style) {
      case 'short':
      case 'medium':
        return { hour: '2-digit', minute: '2-digit' };
      case 'long':
      case 'full':
        return { hour: '2-digit', minute: '2-digit', second: '2-digit' };
      default:
        return { hour: '2-digit', minute: '2-digit' };
    }
  }
}
