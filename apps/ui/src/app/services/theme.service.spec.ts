import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    // Set auth token so service doesn't start in guest mode
    localStorage.setItem('scrape_dojo_access_token', 'test-token');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('theme management', () => {
    it('should initialize with default theme "system" when no theme stored', () => {
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
      TestBed.flushEffects();
      expect(localStorage.getItem('scrape-dojo-theme')).toBe('dark');
    });

    it('should apply the Tailwind dark class to <html> when theme is dark', () => {
      service.setTheme('dark');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      service.setTheme('light');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
