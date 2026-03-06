import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HealthService,
      ],
    });
    service = TestBed.inject(HealthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format uptime correctly', () => {
    expect(service.formatUptime(0)).toBe('0s');
    expect(service.formatUptime(65)).toBe('1m 5s');
    expect(service.formatUptime(3661)).toBe('1h 1m 1s');
    expect(service.formatUptime(90061)).toBe('1d 1h 1m 1s');
  });

  it('should expose isApiOnline signal', () => {
    expect(typeof service.isApiOnline()).toBe('boolean');
  });

  it('should expose isApiOffline signal', () => {
    expect(typeof service.isApiOffline()).toBe('boolean');
  });
});
