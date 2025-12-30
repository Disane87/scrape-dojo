import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScrapeService } from './scrape.service';
import { ApiService } from './api.service';
import { of } from 'rxjs';

describe('ScrapeService', () => {
  let service: ScrapeService;
  let apiService: any; // ApiService

  const mockApiService = {
    getScrapes: vi.fn(),
    runScrape: vi.fn(),
    stopScrape: vi.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ScrapeService,
        { provide: ApiService, useValue: mockApiService },
      ],
    });
    service = TestBed.inject(ScrapeService);
    apiService = TestBed.inject(ApiService) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getScrapes', () => {
    it('should load scrapes from API', () => {
      const mockScrapes = [
        { id: 'test1', metadata: {}, steps: [] },
        { id: 'test2', metadata: {}, steps: [] },
      ];
      mockApiService.getScrapes.mockReturnValue(of(mockScrapes));

      service.getScrapes().subscribe(scrapes => {
        expect(scrapes).toEqual(mockScrapes);
      });

      expect(apiService.getScrapes).toHaveBeenCalled();
    });
  });

  describe('runScrape', () => {
    it('should execute scrape via API', () => {
      const scrapeId = 'test-scrape';
      mockApiService.runScrape.mockReturnValue(of({ success: true }));

      service.runScrape(scrapeId).subscribe(result => {
        expect(result.success).toBe(true);
      });

      expect(apiService.runScrape).toHaveBeenCalledWith(scrapeId);
    });
  });
});
