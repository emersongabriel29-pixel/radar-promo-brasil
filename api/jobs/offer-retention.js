import { db, scheduler } from 'hatchable';
import {
  DELETE_STALE_DISCOVERY_SQL,
  DELETE_STALE_UNCONFIRMED_OFFERS_SQL,
  DISCOVERY_RETENTION_BATCH_SIZE,
  OFFER_RETENTION_BATCH_SIZE,
  OFFER_RETENTION_ROUTE,
  OFFER_RETENTION_TASK_NAME,
  nextOfferRetentionAt
} from 'lib/offer-retention.js';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function handler(req, res) {
  // Arm the next exact 48-hour one-shot before touching data. If cleanup fails,
  // the next attempt is still scheduled. Reusing the task name prevents duplicates.
  const nextRunAt = nextOfferRetentionAt();
  await scheduler.at(nextRunAt, OFFER_RETENTION_ROUTE, { name: OFFER_RETENTION_TASK_NAME });

  if (req.body?.armOnly === true) {
    return res.json({
      ok: true,
      armed: true,
      executed: false,
      nextRunAt,
      intervalHours: 48
    });
  }

  const discovery = await db.query(DELETE_STALE_DISCOVERY_SQL, [DISCOVERY_RETENTION_BATCH_SIZE]);
  const offers = await db.query(DELETE_STALE_UNCONFIRMED_OFFERS_SQL, [OFFER_RETENTION_BATCH_SIZE]);

  return res.json({
    ok: true,
    armed: true,
    executed: true,
    executedAt: new Date().toISOString(),
    nextRunAt,
    intervalHours: 48,
    removed: {
      staleDiscoveryRecords: discovery.rows.length,
      unconfirmedOffers: offers.rows.length,
      total: discovery.rows.length + offers.rows.length
    },
    limits: {
      discoveryBatch: DISCOVERY_RETENTION_BATCH_SIZE,
      offersBatch: OFFER_RETENTION_BATCH_SIZE
    },
    preserved: [
      'APPROVED/PUBLISHED offers',
      'offers with VALID/VALIDATED/CONFIRMED validation',
      'storefront-visible offers',
      'offers referenced by publications',
      'offers with price history',
      'offers linked to discovery records',
      'safety-blocked discovery records'
    ]
  });
}
