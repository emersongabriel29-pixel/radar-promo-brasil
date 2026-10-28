/**
 * Small security primitives shared by public API handlers.
 * Never return raw provider/database exceptions to unauthenticated callers.
 */
export function constantTimeSecretMatch(expected, supplied) {
  const left = String(expected ?? '');
  const right = String(supplied ?? '');
  if (!left || !right || left.length > 512 || right.length > 512) return false;

  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  // Compare the full maximum length; do not stop at the first mismatch.
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] || 0) ^ (b[i] || 0);
  }
  return diff === 0;
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function safePublicError() {
  return { ok: false, error: 'Falha ao processar a solicitação.' };
}
