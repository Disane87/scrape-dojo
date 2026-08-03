import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import { sendHttpRequest } from './_helpers/http-request.helper';

export type TelegramParseMode = 'MarkdownV2' | 'HTML' | 'Markdown' | 'None';

export type TelegramActionParams = {
  /** Bot token from @BotFather — store this as a secret, not in the config file */
  botToken: string;
  /** Target chat id, e.g. "123456789" or "@mychannel" */
  chatId: string | number;
  /** Message text */
  message: string;
  /** Telegram formatting mode (default: None) */
  parseMode?: TelegramParseMode;
  /** Deliver silently, without a notification sound (default: false) */
  disableNotification?: boolean;
  /** Topic id, for supergroups with topics enabled */
  messageThreadId?: number;
  /** Abort the request after this many ms (default: 15000) */
  timeout?: number;
  /** Number of retries (default: 2) */
  retries?: number;
  /** Fail the whole scrape when the message ultimately cannot be sent (default: false) */
  failOnError?: boolean;
};

/** Telegram rejects anything longer than this. */
const MAX_MESSAGE_LENGTH = 4096;

type TelegramResponse = { ok?: boolean; description?: string };

@Action('telegram', {
  displayName: 'Telegram',
  icon: 'Send',
  description: 'Send a Telegram message via a bot',
  color: 'blue',
  category: 'utility',
})
export class TelegramAction extends BaseAction<TelegramActionParams> {
  async run(): Promise<unknown> {
    const {
      botToken,
      chatId,
      message,
      parseMode = 'None',
      disableNotification = false,
      messageThreadId,
      timeout,
      retries,
      failOnError = false,
    } = this.params;

    const missing = (['botToken', 'chatId', 'message'] as const).filter(
      (k) => this.params[k] === undefined || this.params[k] === '',
    );
    if (missing.length) {
      return this.fail(
        `telegram: missing required parameter(s): ${missing.join(', ')}`,
        failOnError,
      );
    }

    let text = String(message);
    if (text.length > MAX_MESSAGE_LENGTH) {
      this.logger.warn(
        `Message is ${text.length} characters, Telegram allows ${MAX_MESSAGE_LENGTH} — truncating`,
      );
      text = `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_notification: disableNotification,
    };
    if (parseMode !== 'None') payload.parse_mode = parseMode;
    if (messageThreadId !== undefined)
      payload.message_thread_id = messageThreadId;

    this.logger.log(`✈️ Sending Telegram message to ${chatId}`);

    // The bot token has to sit in the URL — that is what the Bot API expects.
    // The shared helper masks `/bot<token>/` before anything is logged.
    const result = await sendHttpRequest(
      {
        url: `https://api.telegram.org/bot${botToken}/sendMessage`,
        method: 'POST',
        body: payload,
        timeout,
        retries,
      },
      (attempt, waitMs, reason) =>
        this.logger.warn(`↻ Retry ${attempt} in ${waitMs}ms (${reason})`),
    );

    // Telegram answers 200 with `ok: false` for rejected messages — for example
    // a malformed MarkdownV2 body. Treating that as success would hide it.
    const data = result.data as TelegramResponse | null;
    if (!result.ok || data?.ok === false) {
      const reason = data?.description ?? result.error ?? 'no reason given';
      return this.fail(`telegram: message not sent — ${reason}`, failOnError);
    }

    this.logger.log('✅ Telegram message sent');
    return data;
  }

  private fail(message: string, failOnError: boolean): null {
    this.logger.error(message);
    if (failOnError) throw new Error(message);
    return null;
  }
}

export default TelegramAction;
