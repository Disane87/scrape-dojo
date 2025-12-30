import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HealthService],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkHealth', () => {
    it('should retrieve health status', () => {
      const mockHealth = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 12345,
      };

      service.checkHealth().subscribe(health => {
        expect(health.status).toBe('ok');
        expect(health.uptime).toBeGreaterThan(0);
      });

      const req = httpMock.expectOne('/api/health');
      expect(req.request.method).toBe('GET');
      req.flush(mockHealth);
    });
  });

  describe('checkLiveness', () => {
    it('should check liveness endpoint', () => {
      const mockLiveness = { status: 'ok' };

      service.checkLiveness().subscribe(result => {
        expect(result.status).toBe('ok');
      });

      const req = httpMock.expectOne('/api/health/live');
      expect(req.request.method).toBe('GET');
      req.flush(mockLiveness);
    });
  });

  describe('checkReadiness', () => {
    it('should check readiness endpoint', () => {
      const mockReadiness = { status: 'ok' };

      service.checkReadiness().subscribe(result => {
        expect(result.status).toBe('ok');
      });

      const req = httpMock.expectOne('/api/health/ready');
      expect(req.request.method).toBe('GET');
      req.flush(mockReadiness);
    });
  });
});
