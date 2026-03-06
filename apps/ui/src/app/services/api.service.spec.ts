import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should prefix endpoints with /api', () => {
      const mockScrapes = [{ id: 'test1' }];

      service.get<any[]>('scrapes').subscribe((scrapes) => {
        expect(scrapes).toEqual(mockScrapes);
      });

      const req = httpMock.expectOne('/api/scrapes');
      expect(req.request.method).toBe('GET');
      req.flush(mockScrapes);
    });
  });

  describe('post', () => {
    it('should POST to /api/*', () => {
      const mockResponse = { success: true };

      service.post<{ success: boolean }>('scrape/stop', {}).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/scrape/stop');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });
});
