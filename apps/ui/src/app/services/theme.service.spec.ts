import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    // Reset localStorage before service initialization
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('theme management', () => {
    it('should initialize with default theme "system" when localStorage is empty', () => {
      expect(service.theme()).toBe('system');
    });

    it('should change theme via setTheme()', () => {
      service.setTheme('dark');
      expect(service.theme()).toBe('dark');

      service.setTheme('light');
      expect(service.theme()).toBe('light');
    });

    it('should persist theme in localStorage', () => {
      service.setTheme('dark');
      expect(localStorage.getItem('scrape-dojo-theme')).toBe('dark');
    });

    it('should apply the Tailwind dark class to <html> when theme is dark', () => {
      service.setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      service.setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
