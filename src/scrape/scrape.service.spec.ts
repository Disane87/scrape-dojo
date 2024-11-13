import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeService } from './scrape.service';

describe('ScrapeService', () => {
  let service: ScrapeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScrapeService],
    }).compile();

    service = module.get<ScrapeService>(ScrapeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
