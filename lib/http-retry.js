const RETRYABLE = new Set([429,500,502,503,504]);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry(url, options = {}, settings = {}) {
  const attempts = Math.max(1, Math.min(4, Number(settings.attempts) || 3));
  const timeoutMs = Math.max(1000, Math.min(30000, Number(settings.timeoutMs) || 12000));
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (attempt + 1 >= attempts) throw error;
      const base = [500, 1200, 2600][attempt] || 2600;
      await sleep(base + Math.floor(Math.random() * 400));
      continue;
    }
    if (!RETRYABLE.has(response.status) || attempt + 1 >= attempts) return response;
    const retryAfter = Number(response.headers?.get?.('retry-after') || 0);
    try { await response.text(); } catch {}
    const base = [500, 1200, 2600][attempt] || 2600;
    const delay = retryAfter > 0 ? Math.min(10000, retryAfter * 1000) : base + Math.floor(Math.random() * 400);
    await sleep(delay);
  }
  throw new Error('HTTP_RETRY_EXHAUSTED');
}