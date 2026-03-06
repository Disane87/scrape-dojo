import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { LanguageService } from './language.service';
import { TranslocoService } from '@jsverse/transloco';

describe('LanguageService', () => {
  let service: LanguageService;
  let translocoService: any;

  const mockTranslocoService = {
    setActiveLang: vi.fn(),
    getActiveLang: vi.fn().mockReturnValue('en'),
    getAvailableLangs: vi.fn().mockReturnValue(['en', 'de']),
    load: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        LanguageService,
        { provide: TranslocoService, useValue: mockTranslocoService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(LanguageService);
    translocoService = TestBed.inject(TranslocoService) as any;
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
      const lang = service.getLanguage();
      expect(lang).toBe('en');
    });

    it('should persist language preference', () => {
      service.setLanguage('de');
      const stored = localStorage.getItem('scrape-dojo-language');
      expect(stored).toBe('de');
    });

    it('should get available languages', () => {
      const langs = service.getAvailableLanguages();
      expect(langs).toEqual(['en', 'de']);
    });
  });
});
