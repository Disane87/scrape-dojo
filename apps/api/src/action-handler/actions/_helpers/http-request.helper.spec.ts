import { vi } from 'vitest';
import { redactUrl, sendHttpRequest } from './http-request.helper';

function mockResponse(status: number, body = '', ok?: boolean) {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    statusText: '',
    text: vi.fn().mockResolvedValue(body),
  };
}

describe('http-request.helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('redactUrl', () => {
    it('masks a Telegram bot token in the path', () => {
      expect(
        redactUrl('https://api.telegram.org/bot12345:SECRET/sendMessage'),
      ).toBe('https://api.telegram.org/bot•••/sendMessage');
    });

    it('masks a query string', () => {
      expect(redactUrl('https://example.com/hook?token=abc')).toBe(
        'https://example.com/hook?…',
      );
    });

    it('leaves a plain url untouched', () => {
      expect(redactUrl('https://example.com/hook')).toBe(
        'https://example.com/hook',
      );
    });
  });

  describe('sendHttpRequest', () => {
    it('returns parsed JSON on success', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(200, '{"ok":true}')),
      );

      const result = await sendHttpRequest({ url: 'https://example.com/hook' });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ ok: true });
    });

    it('returns the raw text when the body is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockResponse(200, 'thanks')),
      );

      const result = await sendHttpRequest({ url: 'https://example.com/hook' });

      expect(result.data).toBe('thanks');
    });

    it('sets Content-Type automatically for object bodies', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, '{}'));
      vi.stubGlobal('fetch', fetchMock);

      await sendHttpRequest({
        url: 'https://example.com/hook',
        body: { a: 1 },
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe('{"a":1}');
    });

    it('does not send a body for GET', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, '{}'));
      vi.stubGlobal('fetch', fetchMock);

      await sendHttpRequest({
        url: 'https://example.com/hook',
        method: 'GET',
        body: { a: 1 },
      });

      expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
    });

    it('retries on a transient status and succeeds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(mockResponse(503))
        .mockResolvedValueOnce(mockResponse(200, '{"ok":true}'));
      vi.stubGlobal('fetch', fetchMock);
      const onRetry = vi.fn();

      const result = await sendHttpRequest(
        { url: 'https://example.com/hook', retryDelay: 1 },
        onRetry,
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
    });

    it('does not retry on a client error', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(mockResponse(400, 'bad request'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendHttpRequest({
        url: 'https://example.com/hook',
        retryDelay: 1,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });

    it('gives up after the configured number of retries', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendHttpRequest({
        url: 'https://example.com/hook',
        retries: 2,
        retryDelay: 1,
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('reports an aborted request as a timeout', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

      const result = await sendHttpRequest({
        url: 'https://example.com/hook',
        retries: 0,
        timeout: 1234,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('timeout after 1234ms');
    });

    it('keeps credentials out of the error message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

      const result = await sendHttpRequest({
        url: 'https://api.telegram.org/bot12345:SECRET/sendMessage',
        retries: 0,
      });

      expect(result.error).not.toContain('SECRET');
      expect(result.error).toContain('bot•••');
    });
  });
});
