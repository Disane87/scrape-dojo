import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ScrapeService } from './scrape.service';

describe('ScrapeService', () => {
  let service: ScrapeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ScrapeService,
      ],
    });
    service = TestBed.inject(ScrapeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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

      service.getScrapes().subscribe((scrapes) => {
        expect(scrapes).toEqual(mockScrapes);
      });

      const req = httpMock.expectOne('/api/scrapes');
      expect(req.request.method).toBe('GET');
      req.flush(mockScrapes);
    });
  });

  describe('runScrape', () => {
    it('should execute scrape via API', () => {
      const scrapeId = 'test-scrape';

      service.runScrape(scrapeId).subscribe((result) => {
        expect(result).toBeTruthy();
      });

      const req = httpMock.expectOne(`/api/run/${scrapeId}`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });
  });

  describe('stopScrape', () => {
    it('should stop scrape via API', () => {
      service.stopScrape().subscribe((result) => {
        expect(result.stopped).toBe(true);
      });

      const req = httpMock.expectOne('/api/scrape/stop');
      expect(req.request.method).toBe('POST');
      req.flush({ stopped: true, message: 'Stopped' });
    });
  });
});
