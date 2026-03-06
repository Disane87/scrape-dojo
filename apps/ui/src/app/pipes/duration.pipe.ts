import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true,
  pure: true,
})
export class DurationPipe implements PipeTransform {
  transform(start: number, end?: number): string {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  }
}
