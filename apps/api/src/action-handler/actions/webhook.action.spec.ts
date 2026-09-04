import { vi } from 'vitest';
import { WebhookAction } from './webhook.action';
import { createActionInstance } from 'src/_test/test-utils';

function mockResponse(status: number, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('WebhookAction', () => {
  let action: WebhookAction;

  beforeEach(() => {
    action = createActionInstance(WebhookAction);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(WebhookAction).toBeDefined();
  });

  describe('run', () => {
    it('returns the parsed response on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(200, '{"id":7}')),
      );
      action.params = { url: 'https://example.com/hook' } as any;

      await expect(action.run()).resolves.toEqual({ id: 7 });
    });

    it('defaults to POST', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, '{}'));
      vi.stubGlobal('fetch', fetchMock);
      action.params = { url: 'https://example.com/hook' } as any;

      await action.run();

      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    });

    it('passes custom headers through', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, '{}'));
      vi.stubGlobal('fetch', fetchMock);
      action.params = {
        url: 'https://example.com/hook',
        headers: { Authorization: 'Bearer x' },
      } as any;

      await action.run();

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer x');
    });

    it('returns null and logs when url is missing', async () => {
      action.params = {} as any;

      await expect(action.run()).resolves.toBeNull();
      expect((action as any).logger.error).toHaveBeenCalled();
    });

    it('throws when url is missing and failOnError is set', async () => {
      action.params = { failOnError: true } as any;

      await expect(action.run()).rejects.toThrow(/url/);
    });

    it('returns null on a failed request by default', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(500, 'nope')),
      );
      action.params = { url: 'https://example.com/hook', retries: 0 } as any;

      await expect(action.run()).resolves.toBeNull();
      expect((action as any).logger.error).toHaveBeenCalled();
    });

    it('throws on a failed request when failOnError is set', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(500, 'nope')),
      );
      action.params = {
        url: 'https://example.com/hook',
        retries: 0,
        failOnError: true,
      } as any;

      await expect(action.run()).rejects.toThrow(/webhook/);
    });

    it('never writes header values to the log', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(200, '{}')),
      );
      action.params = {
        url: 'https://example.com/hook',
        headers: { Authorization: 'Bearer SUPERSECRET' },
      } as any;

      await action.run();

      const logged = (action as any).logger.log.mock.calls.flat().join(' ');
      expect(logged).not.toContain('SUPERSECRET');
    });
  });
});
