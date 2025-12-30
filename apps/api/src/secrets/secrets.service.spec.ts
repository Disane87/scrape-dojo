import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from './secrets.service';
import { DatabaseService } from '../database/database.service';

describe('SecretsService', () => {
  let service: SecretsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        {
          provide: DatabaseService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(() => null),
          },
        },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
