export const access = 'scheduler';
export const methods = ['POST'];

/**
 * Health/visibility endpoint only.
 *
 * Marketplace workers have independent recurring hourly crons. Do not fan
 * them out with scheduler.now(): one-shot runs share the Free-plan daily
 * budget with unrelated workflows and can starve discovery.
 *
 * Keep this response shape stable for existing monitoring consumers.
 */
export default async function handler(req, res) {
  return res.json({
    ok: true,
    scheduledSeparately: true,
    lomadee: { ok: true, scheduledSeparately: true },
    shopee: { ok: true, scheduledSeparately: true },
    aliexpressReview: { ok: true, scheduledSeparately: true },
    aiEnrichment: { ok: true, scheduledSeparately: true },
    note: 'Workers run on independent recurring hourly crons; this endpoint does not enqueue one-shot jobs.'
  });
}
