/**
 * Shared outbound HTTP helper for actions that talk to external services.
 *
 * Both `webhook` and `telegram` use this so that retries, timeouts and error
 * handling behave identically — and so that URLs are redacted the same way in
 * every log line.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type HttpRequestOptions = {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
};

export type HttpRequestResult = {
  ok: boolean;
  status?: number;
  /** Parsed JSON when the response is JSON, the raw text otherwise */
  data?: unknown;
  /** Human-readable reason when `ok` is false */
  error?: string;
};

/** Statuses worth trying again — transient by nature. */
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

/**
 * Removes credentials from a URL before it reaches a log file.
 *
 * Query strings frequently carry tokens, and some APIs put the credential in
 * the path itself — the Telegram Bot API is the common example
 * (`/bot<token>/sendMessage`). Both are masked here.
 */
export function redactUrl(url: string): string {
  let safe = url.replace(/\/bot[^/]+\//, '/bot•••/');
  const cut = safe.indexOf('?');
  if (cut !== -1) safe = `${safe.slice(0, cut)}?…`;
  return safe;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sendHttpRequest(
  options: HttpRequestOptions,
  onRetry?: (attempt: number, waitMs: number, reason: string) => void,
): Promise<HttpRequestResult> {
  const {
    url,
    method = 'POST',
    headers = {},
    body,
    timeout = 15000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  const hasBody = body !== undefined && method !== 'GET' && method !== 'DELETE';
  const isJson = hasBody && typeof body === 'object' && body !== null;

  const requestHeaders: Record<string, string> = { ...headers };
  const hasContentType = Object.keys(requestHeaders).some(
    (k) => k.toLowerCase() === 'content-type',
  );
  if (isJson && !hasContentType) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let lastError = 'unknown error';

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const wait = retryDelay * Math.pow(2, attempt - 1);
      onRetry?.(attempt, wait, lastError);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: hasBody
          ? isJson
            ? JSON.stringify(body)
            : String(body)
          : undefined,
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        if (RETRYABLE_STATUS.includes(response.status) && attempt < retries) {
          continue;
        }
        return {
          ok: false,
          status: response.status,
          data: parseBody(text),
          error: `${redactUrl(url)} responded ${response.status} — ${text.slice(0, 200)}`,
        };
      }

      return { ok: true, status: response.status, data: parseBody(text) };
    } catch (error) {
      // An aborted request surfaces as AbortError. Report it as a timeout,
      // which is what actually happened from the caller's point of view.
      const aborted = (error as Error)?.name === 'AbortError';
      lastError = aborted
        ? `timeout after ${timeout}ms`
        : ((error as Error)?.message ?? 'network error');
      if (attempt < retries) continue;
      return {
        ok: false,
        error: `request to ${redactUrl(url)} failed — ${lastError}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return { ok: false, error: lastError };
}
