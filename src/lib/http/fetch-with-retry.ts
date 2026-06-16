export type FetchWithRetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  retryOn?: (response: Response) => boolean;
  init?: RequestInit;
};

const DEFAULT_RETRY_ON = (res: Response) => res.status === 502 || res.status === 503 || res.status === 504;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * fetch z ponowieniem przy błędach sieciowych i 502/503/504.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const { retries = 2, retryDelayMs = 400, retryOn = DEFAULT_RETRY_ON, init } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!retryOn(res) || attempt === retries) return res;
      await sleep(retryDelayMs * (attempt + 1));
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithRetry failed");
}
