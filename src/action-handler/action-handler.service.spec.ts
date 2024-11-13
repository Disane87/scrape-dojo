import { Test, TestingModule } from '@nestjs/testing';
import { ActionHandlerService } from './action-handler.service';

describe('ActionHandlerService', () => {
  let service: ActionHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionHandlerService],
    }).compile();

    service = module.get<ActionHandlerService>(ActionHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
