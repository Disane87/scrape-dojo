import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TranslocoService } from '@jsverse/transloco';

describe('LanguageService', () => {
  let service: LanguageService;
  let translocoService: any; // TranslocoService

  const mockTranslocoService = {
    setActiveLang: vi.fn(),
    getActiveLang: vi.fn(),
    load: vi.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: mockTranslocoService },
      ],
    });
    service = TestBed.inject(LanguageService);
    translocoService = TestBed.inject(TranslocoService) as any;
    
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('language management', () => {
    it('should set language', () => {
      service.setLanguage('de');
      expect(translocoService.setActiveLang).toHaveBeenCalledWith('de');
    });

    it('should get current language', () => {
      mockTranslocoService.getActiveLang.mockReturnValue('en');
      const lang = service.getCurrentLanguage();
      expect(lang).toBe('en');
    });

    it('should persist language preference', () => {
      service.setLanguage('de');
      const stored = localStorage.getItem('language');
      expect(stored).toBe('de');
    });

    it('should load language from localStorage', () => {
      localStorage.setItem('language', 'fr');
      service.loadLanguagePreference();
      expect(translocoService.setActiveLang).toHaveBeenCalledWith('fr');
    });
  });
});
