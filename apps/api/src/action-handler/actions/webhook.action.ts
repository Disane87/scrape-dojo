import { BaseAction } from './bases/base.action';
import { Action } from '../_decorators/action.decorator';
import {
  HttpMethod,
  redactUrl,
  sendHttpRequest,
} from './_helpers/http-request.helper';

export type WebhookActionParams = {
  /** Target URL */
  url: string;
  /** HTTP method (default: POST) */
  method?: HttpMethod;
  /** Additional request headers */
  headers?: Record<string, string>;
  /**
   * Request body. Objects and arrays are sent as JSON, strings are sent as-is.
   * Ignored for GET and DELETE.
   */
  body?: unknown;
  /** Abort the request after this many ms (default: 15000) */
  timeout?: number;
  /** Number of retries on network errors and transient statuses (default: 2) */
  retries?: number;
  /** Delay between retries in ms, doubled on each attempt (default: 1000) */
  retryDelay?: number;
  /** Fail the whole scrape when the request ultimately fails (default: false) */
  failOnError?: boolean;
};

@Action('webhook', {
  displayName: 'Webhook',
  icon: 'Webhook',
  description:
    'Send an HTTP request to an external service — for notifications, chat messages or any other API',
  color: 'blue',
  category: 'utility',
})
export class WebhookAction extends BaseAction<WebhookActionParams> {
  async run(): Promise<unknown> {
    const {
      url,
      method = 'POST',
      headers,
      body,
      timeout,
      retries,
      retryDelay,
      failOnError = false,
    } = this.params;

    if (!url) {
      return this.fail('webhook: "url" parameter is required', failOnError);
    }

    // Log the target but never the headers — they routinely carry tokens.
    this.logger.log(`🌐 ${method} ${redactUrl(url)}`);

    const result = await sendHttpRequest(
      { url, method, headers, body, timeout, retries, retryDelay },
      (attempt, waitMs, reason) =>
        this.logger.warn(`↻ Retry ${attempt} in ${waitMs}ms (${reason})`),
    );

    if (!result.ok) {
      return this.fail(`webhook: ${result.error}`, failOnError);
    }

    this.logger.log(`✅ ${result.status}`);
    return result.data;
  }

  private fail(message: string, failOnError: boolean): null {
    this.logger.error(message);
    if (failOnError) throw new Error(message);
    return null;
  }
}

export default WebhookAction;
