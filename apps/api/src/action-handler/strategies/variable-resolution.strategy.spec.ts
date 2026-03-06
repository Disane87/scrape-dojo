import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VariableResolutionStrategy } from './variable-resolution.strategy';

describe('VariableResolutionStrategy', () => {
  let strategy: VariableResolutionStrategy;
  let mockVariablesService: any;

  beforeEach(() => {
    mockVariablesService = {
      getAsMap: vi.fn().mockResolvedValue({}),
    };

    strategy = new VariableResolutionStrategy(mockVariablesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('resolve', () => {
    it('should return empty map when no scrapeId and no runtime vars', async () => {
      const result = await strategy.resolve();

      expect(result).toEqual({});
      expect(mockVariablesService.getAsMap).not.toHaveBeenCalled();
    });

    it('should load DB variables when scrapeId is provided', async () => {
      mockVariablesService.getAsMap.mockResolvedValue({
        username: 'admin',
        baseUrl: 'https://example.com',
      });

      const result = await strategy.resolve('scrape-123');

      expect(mockVariablesService.getAsMap).toHaveBeenCalledWith('scrape-123');
      expect(result).toEqual({
        username: 'admin',
        baseUrl: 'https://example.com',
      });
    });

    it('should merge runtime variables with DB variables', async () => {
      mockVariablesService.getAsMap.mockResolvedValue({
        username: 'admin',
        baseUrl: 'https://example.com',
      });

      const result = await strategy.resolve('scrape-123', {
        extraVar: 'value',
      });

      expect(result).toEqual({
        username: 'admin',
        baseUrl: 'https://example.com',
        extraVar: 'value',
      });
    });

    it('should let runtime variables override DB variables', async () => {
      mockVariablesService.getAsMap.mockResolvedValue({
        username: 'admin',
        env: 'production',
      });

      const result = await strategy.resolve('scrape-123', {
        username: 'custom-user',
      });

      expect(result.username).toBe('custom-user');
      expect(result.env).toBe('production');
    });

    it('should apply runtime variables without scrapeId', async () => {
      const result = await strategy.resolve(undefined, {
        token: 'abc123',
      });

      expect(mockVariablesService.getAsMap).not.toHaveBeenCalled();
      expect(result).toEqual({ token: 'abc123' });
    });

    it('should skip empty runtime variables', async () => {
      mockVariablesService.getAsMap.mockResolvedValue({ key: 'val' });

      const result = await strategy.resolve('scrape-1', {});

      expect(result).toEqual({ key: 'val' });
    });
  });

  describe('validate', () => {
    it('should return valid when all required variables are present', () => {
      const result = strategy.validate(
        { username: 'admin', password: 'secret' },
        ['username', 'password'],
      );

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid with missing variables', () => {
      const result = strategy.validate({ username: 'admin' }, [
        'username',
        'password',
        'apiKey',
      ]);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['password', 'apiKey']);
    });

    it('should return valid when no required variables', () => {
      const result = strategy.validate({ anything: 'value' }, []);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when variables map is empty', () => {
      const result = strategy.validate({}, ['required']);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['required']);
    });
  });
});
