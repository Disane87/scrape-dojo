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
  });

  describe('stopScrape', () => {
    it('should call scrapeService.stopScrape', async () => {
      mockScrapeService.stopScrape.mockResolvedValue({ stopped: true } as any);

      await controller.stopScrape();

      expect(scrapeService.stopScrape).toHaveBeenCalled();
    });
  });
});
