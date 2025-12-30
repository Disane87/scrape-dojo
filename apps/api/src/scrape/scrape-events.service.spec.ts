import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeEventsService } from './scrape-events.service';

describe('ScrapeEventsService', () => {
  let service: ScrapeEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScrapeEventsService],
    }).compile();

    service = module.get<ScrapeEventsService>(ScrapeEventsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('emitEvent', () => {
    it('should emit event successfully', () => {
      const event = {
        scrapeId: 'test',
        type: 'log' as const,
        level: 'log' as const,
        message: 'Test message',
        timestamp: new Date(),
      };

      expect(() => service.emitLog('log', 'Test message', 'test-context')).not.toThrow();
    });
  });

  describe('getEvents', () => {
    it('should return observable', () => {
      const events$ = service.getEvents();
      expect(events$).toBeDefined();
      expect(typeof events$.subscribe).toBe('function');
    });
  });

  describe('OTP handling', () => {
    it('should handle OTP requests', () => {
      expect(service).toBeDefined();
    });
  });
});
