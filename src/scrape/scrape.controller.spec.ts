import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeController } from './scrape.controller';

describe('ScrapeController', () => {
  let controller: ScrapeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScrapeController],
    }).compile();

    controller = module.get<ScrapeController>(ScrapeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
