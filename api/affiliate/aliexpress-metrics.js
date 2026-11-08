import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET'];

async function accountFor(member) {
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(member.id)])).rows[0];
}

export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para consultar as métricas AliExpress.' });
  const account = await accountFor(req.member);
  if (!account) return res.status(412).json({ error: 'Conta Radar ativa não encontrada.' });
  const id = account.id;
  try {
    const [catalog, runs24h, runs7d, offers, publications, keywords, choices, skuHealth, latest, coupons, campaigns, couponPayloads, productDetailHealth, campaignQueue] = await Promise.all([
      db.query("SELECT processing_status,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE last_seen_at>=now()-interval '24 hours')::int AS seen_24h FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' GROUP BY processing_status ORDER BY total DESC", [id]),
      db.query("SELECT COUNT(*)::int AS runs,COALESCE(SUM(pages_completed),0)::int AS api_calls,COALESCE(SUM(records_seen),0)::int AS records_seen,COALESCE(SUM(records_upserted),0)::int AS records_upserted,COUNT(*) FILTER(WHERE status IN ('FAILED','PARTIAL'))::int AS failed_runs,MAX(finished_at) AS last_run FROM affiliate_discovery_runs WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND created_at>=now()-interval '24 hours'", [id]),
      db.query("SELECT COUNT(*)::int AS runs,COALESCE(SUM(pages_completed),0)::int AS api_calls,COALESCE(SUM(records_seen),0)::int AS records_seen,COALESCE(SUM(records_upserted),0)::int AS records_upserted,COUNT(*) FILTER(WHERE status IN ('FAILED','PARTIAL'))::int AS failed_runs FROM affiliate_discovery_runs WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND created_at>=now()-interval '7 days'", [id]),
      db.query("SELECT status,validation_status,COUNT(*)::int AS total,ROUND(AVG(COALESCE(radar_score,score,0)))::int AS avg_score FROM offers WHERE account_id=$1 AND source='ALIEXPRESS' GROUP BY status,validation_status ORDER BY total DESC", [id]),
      db.query("SELECT p.status,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE p.published_at>=now()-interval '24 hours')::int AS sent_24h,COUNT(*) FILTER(WHERE p.created_at>=now()-interval '24 hours')::int AS created_24h,COALESCE(SUM(p.attempts),0)::int AS attempts FROM publications p JOIN offers o ON o.id=p.offer_id AND o.account_id=p.account_id WHERE p.account_id=$1 AND o.source='ALIEXPRESS' GROUP BY p.status ORDER BY total DESC", [id]),
      db.query("SELECT source_keyword,COUNT(*)::int AS products,ROUND(AVG(rating)::numeric,1) AS avg_rating,COUNT(rating)::int AS rated_products,ROUND(AVG(COALESCE(commission_rate,0))::numeric,2) AS avg_commission,COALESCE(SUM(sales_count),0)::bigint AS sales_signal,MAX(last_seen_at) AS last_seen FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' AND source_keyword<>'' GROUP BY source_keyword ORDER BY products DESC,sales_signal DESC LIMIT 30", [id]),
      db.query("SELECT COUNT(*) FILTER(WHERE COALESCE((raw_data->>'_radar_choice_count')::int,0)>0)::int AS products_with_choices,COALESCE(SUM(COALESCE((raw_data->>'_radar_choice_count')::int,0)),0)::int AS choice_options FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='PRODUCT'", [id]),
      db.query("SELECT status,details,last_checked_at FROM account_integration_health WHERE account_id=$1 AND name='ALIEXPRESS_SKU_DETAIL' LIMIT 1", [id]),
      db.query("SELECT operation,status,pages_completed AS api_calls,records_seen,records_upserted,last_error,started_at,finished_at FROM affiliate_discovery_runs WHERE account_id=$1 AND marketplace='ALIEXPRESS' ORDER BY created_at DESC LIMIT 15", [id]),
      db.query("SELECT COUNT(*) FILTER(WHERE NULLIF(coupon_code,'') IS NOT NULL OR NULLIF(coupon_url,'') IS NOT NULL)::int AS offers_with_coupon,COUNT(*) FILTER(WHERE NULLIF(coupon_code,'') IS NOT NULL)::int AS coupon_codes,COUNT(*) FILTER(WHERE NULLIF(coupon_url,'') IS NOT NULL)::int AS coupon_links FROM offers WHERE account_id=$1 AND source='ALIEXPRESS'", [id]),
      db.query("SELECT COUNT(*)::int AS campaigns FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='CAMPAIGN'", [id]),
      db.query("SELECT COALESCE(raw_data->>'_radar_discovery_kind','UNKNOWN') AS source,COUNT(*)::int AS products,COUNT(*) FILTER(WHERE jsonb_exists(raw_data,'promo_code_info') OR jsonb_exists(raw_data,'promoCodeInfo') OR jsonb_array_length(COALESCE(raw_data->'_radar_coupon_field_paths','[]'::jsonb))>0)::int AS products_with_coupon_field,COUNT(*) FILTER(WHERE jsonb_typeof(raw_data->'promo_code_info')='object' OR jsonb_typeof(raw_data->'promoCodeInfo')='object' OR jsonb_typeof(raw_data->'_radar_coupon')='object')::int AS coupon_objects,COALESCE(SUM(jsonb_array_length(COALESCE(raw_data->'_radar_coupon_field_paths','[]'::jsonb))),0)::int AS coupon_field_paths_seen FROM affiliate_discovery_items WHERE account_id=$1 AND marketplace='ALIEXPRESS' AND kind='PRODUCT' GROUP BY 1 ORDER BY products DESC", [id]),
      db.query("SELECT status,details,last_checked_at FROM account_integration_health WHERE account_id=$1 AND name='ALIEXPRESS_PRODUCT_DETAIL' LIMIT 1", [id]),
      db.query("SELECT COUNT(DISTINCT d.external_id)::int AS campaign_products,COUNT(DISTINCT d.external_id) FILTER(WHERE d.offer_id IS NOT NULL)::int AS linked_offers,COUNT(DISTINCT d.external_id) FILTER(WHERE o.status='APPROVED')::int AS approved_offers,COUNT(DISTINCT d.external_id) FILTER(WHERE p.id IS NOT NULL)::int AS publication_records,COUNT(DISTINCT d.external_id) FILTER(WHERE p.status IN ('READY','RETRY','SCHEDULED'))::int AS queued,COUNT(DISTINCT d.external_id) FILTER(WHERE p.status='PUBLISHED')::int AS published FROM affiliate_discovery_items d LEFT JOIN offers o ON o.id=d.offer_id AND o.account_id=d.account_id LEFT JOIN publications p ON p.offer_id=o.id AND p.account_id=o.account_id WHERE d.account_id=$1 AND d.marketplace='ALIEXPRESS' AND d.kind='PRODUCT' AND (d.raw_data->>'_radar_discovery_kind'='FEATURED_CAMPAIGN' OR jsonb_exists(COALESCE(d.raw_data->'_radar_discovery_sources','[]'::jsonb),'FEATURED_CAMPAIGN'))", [id])
    ]);
    const sum = rows => rows.reduce((n, x) => n + Number(x.total || 0), 0);
    const pub = publications.rows;
    return res.json({
      ok: true,
      marketplace: 'ALIEXPRESS',
      generatedAt: new Date().toISOString(),
      windows: {
        last24h: runs24h.rows[0] || {},
        last7d: runs7d.rows[0] || {}
      },
      capture: {
        catalogTotal: sum(catalog.rows),
        keywordCatalogSize: 375,
        catalogByStatus: catalog.rows,
        keywordsTracked: keywords.rows.length,
        topKeywords: keywords.rows
      },
      promotions: { coupons: coupons.rows[0] || {}, campaigns: Number(campaigns.rows[0]?.campaigns || 0), couponPayloads: couponPayloads.rows, campaignQueue: campaignQueue.rows[0] || {} },
      enrichment: { productDetail: productDetailHealth.rows[0] || { status: 'NOT_TESTED', details: '' }, skuDetail: skuHealth.rows[0] || { status: 'NOT_TESTED', details: '' } },
      quality: {
        productsWithChoices: Number(choices.rows[0]?.products_with_choices || 0),
        choiceOptionsCaptured: Number(choices.rows[0]?.choice_options || 0),
        skuDetailPermission: skuHealth.rows[0] || { status: 'NOT_TESTED', details: '' },
        offersByStatus: offers.rows
      },
      distribution: {
        publicationsByStatus: pub,
        sentLast24h: pub.reduce((n, x) => n + Number(x.sent_24h || 0), 0),
        createdLast24h: pub.reduce((n, x) => n + Number(x.created_24h || 0), 0),
        attempts: pub.reduce((n, x) => n + Number(x.attempts || 0), 0)
      },
      recentRuns: latest.rows,
      notes: [
        'api_calls contabiliza as chamadas do job de descoberta e geração de links, não chamadas manuais feitas pela tela de integração.',
        'Produtos incompletos permanecem no catálogo para enriquecimento; bloqueios de segurança permanecem registrados, mas não são publicados.',
        'Quando a permissão SKU Detail estiver liberada, as opções/variações serão consultadas e preservadas no raw_data. No momento, a App Key recebeu InsufficientPermission para esse método.'
      ]
    });
  } catch (error) {
    console.error('AliExpress metrics failed', String(error?.message || 'ERROR').slice(0, 180));
    return res.status(503).json({ error: 'Não foi possível consolidar as métricas AliExpress.' });
  }
}