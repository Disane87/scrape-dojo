import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeController } from './scrape.controller';
import { ScrapeService } from './scrape.service';

describe('ScrapeController', () => {
  let controller: ScrapeController;
  let scrapeService: any /*ScrapeService*/;

  const mockScrapeService = {
    scrape: vi.fn(),
    stopScrape: vi.fn(),
    getScrapes: vi.fn(),
    getScrapeById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScrapeController],
      providers: [
        {
          provide: ScrapeService,
          useValue: mockScrapeService,
        },
      ],
    }).compile();

    controller = module.get<ScrapeController>(ScrapeController);
    scrapeService = module.get(ScrapeService) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('scrape', () => {
    it('should call scrapeService.scrape with correct id', async () => {
      const scrapeId = 'test-scrape';
      mockScrapeService.scrape.mockResolvedValue({ success: true } as any);

      await controller.scrape(scrapeId);

      expect(scrapeService.scrape).toHaveBeenCalledWith(scrapeId);
    });

    it('should return the result from scrapeService.scrape', async () => {
      const expected = {
        success: true,
        scrapeId: 'my-scrape',
        result: { data: 'value' },
      };
      mockScrapeService.scrape.mockResolvedValue(expected);

      const result = await controller.scrape('my-scrape');

      expect(result).toEqual(expected);
    });

    it('should propagate errors from scrapeService.scrape', async () => {
      mockScrapeService.scrape.mockRejectedValue(new Error('Scrape failed'));

      await expect(controller.scrape('bad-id')).rejects.toThrow(
        'Scrape failed',
      );
    });

    it('should handle different scrapeId values', async () => {
      mockScrapeService.scrape.mockResolvedValue({ success: true });

      await controller.scrape('amazon-orders');
      expect(scrapeService.scrape).toHaveBeenCalledWith('amazon-orders');

      await controller.scrape('google-search');
      expect(scrapeService.scrape).toHaveBeenCalledWith('google-search');
    });
  });

  describe('stopScrape', () => {
    it('should call scrapeService.stopScrape', async () => {
      mockScrapeService.stopScrape.mockResolvedValue({ stopped: true } as any);

      await controller.stopScrape();

      expect(scrapeService.stopScrape).toHaveBeenCalled();
    });

    it('should return the result from scrapeService.stopScrape', async () => {
      const expected = {
        stopped: true,
        message: 'Scrape stopped and browser closed',
      };
      mockScrapeService.stopScrape.mockResolvedValue(expected);

      const result = await controller.stopScrape();

      expect(result).toEqual(expected);
    });

    it('should propagate errors from scrapeService.stopScrape', async () => {
      mockScrapeService.stopScrape.mockRejectedValue(new Error('Stop failed'));

      await expect(controller.stopScrape()).rejects.toThrow('Stop failed');
    });

    it('should return stopped: false when no scrape is running', async () => {
      const expected = { stopped: false, message: 'No running scrape' };
      mockScrapeService.stopScrape.mockResolvedValue(expected);

      const result = await controller.stopScrape();

      expect(result.stopped).toBe(false);
    });
  });
});
