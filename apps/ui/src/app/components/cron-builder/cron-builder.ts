import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

interface CronPart {
  value: string;
  label: string;
  description: string;
}

interface PresetSchedule {
  label: string;
  expression: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-cron-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './cron-builder.html',
  styleUrls: ['./cron-builder.scss'],
})
export class CronBuilderComponent {
  private initialized = false;

  @Input() set expression(value: string) {
    if (value && value !== this.cronExpression()) {
      this.parseCronExpression(value);
      this.initialized = true;
    }
  }
  @Input() showPresets = true;

  @Output() expressionChange = new EventEmitter<string>();

  // Mode: simple (presets/UI) or advanced (raw expression)
  mode = signal<'simple' | 'advanced'>('simple');

  // Cron parts
  minute = signal('0');
  hour = signal('9');
  dayOfMonth = signal('*');
  month = signal('*');
  dayOfWeek = signal('*');

  // Simple mode selections
  scheduleType = signal<'every-minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  selectedHour = signal('9');
  selectedMinute = signal('0');
  selectedDays = signal<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  selectedDayOfMonth = signal('1');

  // Computed cron expression
  cronExpression = computed(() => {
    return `${this.minute()} ${this.hour()} ${this.dayOfMonth()} ${this.month()} ${this.dayOfWeek()}`;
  });

  // Human readable description
  humanReadable = computed(() => {
    const expr = this.cronExpression();
    return this.generateDescription(expr);
  });

  // Preset schedules
  presets: PresetSchedule[] = [
    { label: 'Jede Minute', expression: '* * * * *', description: 'Läuft jede Minute', icon: '⚡' },
    { label: 'Stündlich', expression: '0 * * * *', description: 'Jede Stunde zur vollen Stunde', icon: '🕐' },
    { label: 'Täglich 9:00', expression: '0 9 * * *', description: 'Jeden Tag um 9:00 Uhr', icon: '☀️' },
    { label: 'Täglich 18:00', expression: '0 18 * * *', description: 'Jeden Tag um 18:00 Uhr', icon: '🌙' },
    { label: 'Werktags 9:00', expression: '0 9 * * 1-5', description: 'Montag bis Freitag um 9:00', icon: '💼' },
    { label: 'Wöchentlich', expression: '0 9 * * 1', description: 'Jeden Montag um 9:00', icon: '📅' },
    { label: 'Monatlich', expression: '0 9 1 * *', description: 'Am 1. jeden Monats um 9:00', icon: '📆' },
  ];

  // Days of week
  daysOfWeek = [
    { value: 0, short: 'So', long: 'Sonntag' },
    { value: 1, short: 'Mo', long: 'Montag' },
    { value: 2, short: 'Di', long: 'Dienstag' },
    { value: 3, short: 'Mi', long: 'Mittwoch' },
    { value: 4, short: 'Do', long: 'Donnerstag' },
    { value: 5, short: 'Fr', long: 'Freitag' },
    { value: 6, short: 'Sa', long: 'Samstag' },
  ];

  // Hours and minutes for dropdowns
  hours = Array.from({ length: 24 }, (_, i) => i);
  minutes = Array.from({ length: 60 }, (_, i) => i);
  daysOfMonthList = Array.from({ length: 31 }, (_, i) => i + 1);

  constructor() {
    // Emit changes when expression updates (but only after initialization)
    effect(() => {
      const expr = this.cronExpression();
      // Only emit after the component has been initialized with an external expression
      if (this.initialized) {
        this.expressionChange.emit(expr);
      }
    });
  }

  parseCronExpression(expr: string) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length >= 5) {
      this.minute.set(parts[0]);
      this.hour.set(parts[1]);
      this.dayOfMonth.set(parts[2]);
      this.month.set(parts[3]);
      this.dayOfWeek.set(parts[4]);

      // Try to detect schedule type
      this.detectScheduleType();
    }
  }

  detectScheduleType() {
    const min = this.minute();
    const hr = this.hour();
    const dom = this.dayOfMonth();
    const dow = this.dayOfWeek();

    if (min === '*' && hr === '*' && dom === '*' && dow === '*') {
      this.scheduleType.set('every-minute');
    } else if (min !== '*' && hr === '*' && dom === '*' && dow === '*') {
      this.scheduleType.set('hourly');
      this.selectedMinute.set(min);
    } else if (min !== '*' && hr !== '*' && dom === '*' && dow === '*') {
      this.scheduleType.set('daily');
      this.selectedMinute.set(min);
      this.selectedHour.set(hr);
    } else if (min !== '*' && hr !== '*' && dom === '*' && dow !== '*') {
      this.scheduleType.set('weekly');
      this.selectedMinute.set(min);
      this.selectedHour.set(hr);
      this.parseSelectedDays(dow);
    } else if (min !== '*' && hr !== '*' && dom !== '*' && dow === '*') {
      this.scheduleType.set('monthly');
      this.selectedMinute.set(min);
      this.selectedHour.set(hr);
      this.selectedDayOfMonth.set(dom);
    } else {
      this.scheduleType.set('custom');
    }
  }

  parseSelectedDays(dow: string) {
    const days: number[] = [];
    const parts = dow.split(',');

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          days.push(i);
        }
      } else {
        days.push(Number(part));
      }
    }

    this.selectedDays.set(days);
  }

  selectPreset(preset: PresetSchedule) {
    this.initialized = true; // User interaction
    this.parseCronExpression(preset.expression);
    this.mode.set('simple');
  }

  updateScheduleType(type: 'every-minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom') {
    this.initialized = true; // User interaction
    this.scheduleType.set(type);
    this.updateCronFromSimple();
  }

  updateCronFromSimple() {
    const type = this.scheduleType();
    const min = this.selectedMinute();
    const hr = this.selectedHour();
    const dom = this.selectedDayOfMonth();
    const days = this.selectedDays();

    switch (type) {
      case 'every-minute':
        this.minute.set('*');
        this.hour.set('*');
        this.dayOfMonth.set('*');
        this.dayOfWeek.set('*');
        break;

      case 'hourly':
        this.minute.set(min);
        this.hour.set('*');
        this.dayOfMonth.set('*');
        this.dayOfWeek.set('*');
        break;

      case 'daily':
        this.minute.set(min);
        this.hour.set(hr);
        this.dayOfMonth.set('*');
        this.dayOfWeek.set('*');
        break;

      case 'weekly':
        this.minute.set(min);
        this.hour.set(hr);
        this.dayOfMonth.set('*');
        this.dayOfWeek.set(this.formatDaysOfWeek(days));
        break;

      case 'monthly':
        this.minute.set(min);
        this.hour.set(hr);
        this.dayOfMonth.set(dom);
        this.dayOfWeek.set('*');
        break;
    }
  }

  formatDaysOfWeek(days: number[]): string {
    if (days.length === 0) return '*';
    const sorted = [...days].sort((a, b) => a - b);
    return sorted.join(',');
  }

  toggleDay(day: number) {
    this.initialized = true; // User interaction
    const current = this.selectedDays();
    if (current.includes(day)) {
      this.selectedDays.set(current.filter((d) => d !== day));
    } else {
      this.selectedDays.set([...current, day]);
    }
    this.updateCronFromSimple();
  }

  updateSimpleValue(field: 'minute' | 'hour' | 'dayOfMonth', value: string) {
    this.initialized = true; // User interaction
    switch (field) {
      case 'minute':
        this.selectedMinute.set(value);
        break;
      case 'hour':
        this.selectedHour.set(value);
        break;
      case 'dayOfMonth':
        this.selectedDayOfMonth.set(value);
        break;
    }
    this.updateCronFromSimple();
  }

  updateAdvancedPart(part: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek', value: string) {
    this.initialized = true; // User interaction
    switch (part) {
      case 'minute':
        this.minute.set(value);
        break;
      case 'hour':
        this.hour.set(value);
        break;
      case 'dayOfMonth':
        this.dayOfMonth.set(value);
        break;
      case 'month':
        this.month.set(value);
        break;
      case 'dayOfWeek':
        this.dayOfWeek.set(value);
        break;
    }
  }

  generateDescription(expr: string): string {
    const parts = expr.split(/\s+/);
    if (parts.length < 5) return 'Ungültiger Ausdruck';

    const [min, hr, dom, mon, dow] = parts;

    // Every minute
    if (min === '*' && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
      return 'Jede Minute';
    }

    // Hourly
    if (hr === '*' && dom === '*' && mon === '*' && dow === '*') {
      return min === '0' ? 'Jede Stunde zur vollen Stunde' : `Jede Stunde bei Minute ${min}`;
    }

    // Build description
    let desc = '';

    // Time part
    if (hr !== '*' && min !== '*') {
      const hourNum = parseInt(hr, 10);
      const minNum = parseInt(min, 10);
      desc = `Um ${hourNum.toString().padStart(2, '0')}:${minNum.toString().padStart(2, '0')} Uhr`;
    }

    // Day of week
    if (dow !== '*' && dom === '*') {
      const dayNames = this.formatDayNames(dow);
      desc += ` jeden ${dayNames}`;
    }

    // Day of month
    if (dom !== '*' && dow === '*') {
      desc += ` am ${dom}. jeden Monats`;
    }

    // Both wildcards
    if (dom === '*' && dow === '*') {
      desc += ' jeden Tag';
    }

    return desc || expr;
  }

  formatDayNames(dow: string): string {
    const dayMap: Record<number, string> = {
      0: 'Sonntag',
      1: 'Montag',
      2: 'Dienstag',
      3: 'Mittwoch',
      4: 'Donnerstag',
      5: 'Freitag',
      6: 'Samstag',
    };

    const days: number[] = [];
    const parts = dow.split(',');

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end; i++) {
          days.push(i);
        }
      } else {
        days.push(Number(part));
      }
    }

    // Check for weekdays
    const weekdays = [1, 2, 3, 4, 5];
    if (days.length === 5 && weekdays.every((d) => days.includes(d))) {
      return 'Werktag (Mo-Fr)';
    }

    return days.map((d) => dayMap[d]).join(', ');
  }
}
