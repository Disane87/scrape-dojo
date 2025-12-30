import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeAgo',
    standalone: true,
    pure: true
})
export class TimeAgoPipe implements PipeTransform {
    transform(timestamp: number): string {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
