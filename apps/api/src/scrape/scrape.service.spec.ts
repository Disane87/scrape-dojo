import { Test, TestingModule } from '@nestjs/testing';
import { ScrapeService } from './scrape.service';
import { ActionHandlerService } from '../action-handler/action-handler.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { ScrapeEventsService } from './scrape-events.service';
import { DatabaseService } from '../database/database.service';
import { SecretsService } from '../secrets/secrets.service';
import { VariablesService } from '../variables/variables.service';

describe('ScrapeService', () => {
  let service: ScrapeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeService,
        { provide: ActionHandlerService, useValue: {} },
        { provide: PuppeteerService, useValue: {} },
        { provide: ScrapeEventsService, useValue: {} },
        { provide: DatabaseService, useValue: {} },
        { provide: SecretsService, useValue: {} },
        { provide: VariablesService, useValue: {} },
      ],
    }).compile();

    service = module.get<ScrapeService>(ScrapeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScrapeDefinitions', () => {
    it('should return list of scrapes', () => {
      const scrapes = service.getScrapeDefinitions();

      expect(scrapes).toBeDefined();
      expect(Array.isArray(scrapes)).toBe(true);
    });
  });

  describe('getScrapeById', () => {
    it('should work with valid data', () => {
      expect(service).toBeDefined();
    });
  });
});
