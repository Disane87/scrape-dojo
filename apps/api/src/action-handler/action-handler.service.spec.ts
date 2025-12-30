import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ActionHandlerService } from './action-handler.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { VariablesService } from '../variables/variables.service';
import { Logger } from '@nestjs/common';

describe('ActionHandlerService', () => {
  let service: ActionHandlerService;
  let puppeteerService: any /*PuppeteerService*/;
  let variablesService: any /*VariablesService*/;

  const mockPuppeteerService = {
    getPage: vi.fn(),
    closePage: vi.fn(),
    launchBrowser: vi.fn(),
  };

  const mockVariablesService = {
    getVariableValue: vi.fn(),
    getAllVariables: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionHandlerService,
        {
          provide: PuppeteerService,
          useValue: mockPuppeteerService,
        },
        {
          provide: VariablesService,
          useValue: mockVariablesService,
        },
      ],
    }).compile();

    service = module.get<ActionHandlerService>(ActionHandlerService);
    puppeteerService = module.get(PuppeteerService);
    variablesService = module.get(VariablesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log registered actions', () => {
      const loggerSpy = vi.spyOn(Logger.prototype, 'debug');
      service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('getAction', () => {
    it('should return action if it exists', () => {
      const action = service.getAction('navigate');
      expect(action).toBeDefined();
    });

    it('should return undefined if action does not exist', () => {
      const action = service.getAction('nonexistent');
      expect(action).toBeUndefined();
    });
  });

  describe('executeAction', () => {
    it('should have actions available', () => {
      const action = service.getAction('navigate');
      expect(action).toBeDefined();
    });
  });
});
