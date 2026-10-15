import { vi } from 'vitest';
import { TelegramAction } from './telegram.action';
import { createActionInstance } from 'src/_test/test-utils';

function mockResponse(status: number, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: vi.fn().mockResolvedValue(body),
  };
}

const OK_BODY = '{"ok":true,"result":{"message_id":1}}';

describe('TelegramAction', () => {
  let action: TelegramAction;

  beforeEach(() => {
    action = createActionInstance(TelegramAction);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(TelegramAction).toBeDefined();
  });

  describe('run', () => {
    it('posts to the Telegram sendMessage endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, OK_BODY));
      vi.stubGlobal('fetch', fetchMock);
      action.params = { botToken: 'T', chatId: '42', message: 'hi' } as any;

      await action.run();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.telegram.org/botT/sendMessage');
      expect(JSON.parse(init.body)).toMatchObject({
        chat_id: '42',
        text: 'hi',
      });
    });

    it('omits parse_mode when set to None', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, OK_BODY));
      vi.stubGlobal('fetch', fetchMock);
      action.params = { botToken: 'T', chatId: '42', message: 'hi' } as any;

      await action.run();

      expect(
        JSON.parse(fetchMock.mock.calls[0][1].body).parse_mode,
      ).toBeUndefined();
    });

    it('passes parse_mode through when requested', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, OK_BODY));
      vi.stubGlobal('fetch', fetchMock);
      action.params = {
        botToken: 'T',
        chatId: '42',
        message: 'hi',
        parseMode: 'HTML',
      } as any;

      await action.run();

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).parse_mode).toBe(
        'HTML',
      );
    });

    it('truncates messages beyond the Telegram limit', async () => {
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, OK_BODY));
      vi.stubGlobal('fetch', fetchMock);
      action.params = {
        botToken: 'T',
        chatId: '42',
        message: 'x'.repeat(5000),
      } as any;

      await action.run();

      expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toHaveLength(
        4096,
      );
      expect((action as any).logger.warn).toHaveBeenCalled();
    });

    it('reports missing parameters', async () => {
      action.params = { botToken: 'T' } as any;

      await expect(action.run()).resolves.toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('chatId'),
      );
    });

    it('treats a 200 with ok:false as a failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockResponse(200, '{"ok":false,"description":"chat not found"}'),
          ),
      );
      action.params = { botToken: 'T', chatId: 'nope', message: 'hi' } as any;

      // Same contract as every other failure path: null, plus a logged reason.
      await expect(action.run()).resolves.toBeNull();
      expect((action as any).logger.error).toHaveBeenCalledWith(
        expect.stringContaining('chat not found'),
      );
    });

    it('throws on failure when failOnError is set', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            mockResponse(200, '{"ok":false,"description":"bad"}'),
          ),
      );
      action.params = {
        botToken: 'T',
        chatId: '42',
        message: 'hi',
        failOnError: true,
      } as any;

      await expect(action.run()).rejects.toThrow(/telegram/);
    });

    it('never writes the bot token to the log', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
      action.params = {
        botToken: 'SUPERSECRET',
        chatId: '42',
        message: 'hi',
        retries: 0,
      } as any;

      await action.run();

      const logged = [
        ...(action as any).logger.log.mock.calls,
        ...(action as any).logger.error.mock.calls,
        ...(action as any).logger.warn.mock.calls,
      ]
        .flat()
        .join(' ');
      expect(logged).not.toContain('SUPERSECRET');
    });
  });
});
