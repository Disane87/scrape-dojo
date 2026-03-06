import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: true,
})
export class RelativeTimePipe implements PipeTransform {
  private translocoService = inject(TranslocoService);

  transform(timestamp: number, currentTime?: number): string {
    const now = currentTime || Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const lang = this.translocoService.getActiveLang();

    if (lang === 'de') {
      if (seconds < 60) return 'gerade eben';
      if (minutes < 60) return `vor ${minutes} Min.`;
      if (hours < 24) return `vor ${hours} Std.`;
      if (days === 1) return 'gestern';
      if (days < 7) return `vor ${days} Tagen`;

      const date = new Date(timestamp);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      });
    } else {
      if (seconds < 60) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'yesterday';
      if (days < 7) return `${days}d ago`;

      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
      });
    }
  }
}
