import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', () => {
      const result = controller.check();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });

  describe('readiness', () => {
    it('should return readiness status', () => {
      const result = controller.readiness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
    });
  });
});
