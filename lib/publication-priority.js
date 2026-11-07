// Unified cross-marketplace publication priority (0-100).
// Scores rank eligible offers; they never reject an offer by quality alone.
export const publicationPrioritySql = (p = 'p', o = 'o', d = 'd') => `(
  COALESCE(${o}.radar_score,${o}.score,35)::numeric * 0.25
  + (CASE WHEN ${d}.rating IS NULL THEN 55
      WHEN ${d}.rating <= 5 THEN GREATEST(0,LEAST(100,${d}.rating * 20))
      ELSE GREATEST(0,LEAST(100,${d}.rating)) END) * 0.20
  + (CASE WHEN COALESCE(${d}.sales_count,0) <= 0 THEN 0
      ELSE LEAST(100,LN(COALESCE(${d}.sales_count,0)::numeric + 1) / LN(100001::numeric) * 100) END) * 0.12
  + (CASE WHEN COALESCE(${d}.raw_data->>'isOfficialShop','')='true'
      OR lower(COALESCE(${d}.raw_data->>'shopType','')) IN ('mall','official','official_store','loja oficial')
      OR lower(COALESCE(${d}.raw_data->>'store_type','')) IN ('mall','official','official_store') THEN 100 ELSE 0 END) * 0.10
  + (CASE WHEN ${o}.original_price > ${o}.current_price AND ${o}.original_price > 0
      THEN LEAST(100,(${o}.original_price-${o}.current_price)::numeric*100/${o}.original_price)
      ELSE GREATEST(0,LEAST(100,COALESCE(${o}.discount_percent,0))) END) * 0.12
  + (CASE WHEN COALESCE(${o}.price_history_count,0)>=7 THEN 100
      WHEN COALESCE(${o}.price_history_count,0)>=3 THEN 70
      WHEN COALESCE(${o}.price_history_count,0)>0 THEN 35 ELSE 0 END) * 0.10
  + (CASE WHEN ${d}.commission_rate IS NULL THEN 40
      WHEN ${d}.commission_rate <= 1 THEN LEAST(100,${d}.commission_rate*100)
      ELSE LEAST(100,${d}.commission_rate) END) * 0.05
  + (CASE WHEN (CASE WHEN COALESCE(${d}.raw_data->>'_radar_choice_count','') ~ '^[0-9]+$' THEN (${d}.raw_data->>'_radar_choice_count')::int ELSE 0 END)>0
      OR COALESCE(${d}.raw_data->>'isChoice','')='true'
      OR lower(COALESCE(${d}.raw_data->>'product_tag','')) LIKE '%choice%' THEN 100 ELSE 0 END) * 0.03
  + (CASE WHEN NULLIF(trim(COALESCE(${d}.brand_name,'')),'') IS NOT NULL THEN 100
      WHEN ${o}.title ~* '(xiaomi|baseus|ugreen|anker|jbl|lenovo|logitech|samsung|motorola|philips|mondial|oster|electrolux|dewalt|bosch|kingston|sandisk|tp-link|redragon)' THEN 75 ELSE 0 END) * 0.01
  + (CASE WHEN upper(COALESCE(${d}.raw_data->>'ship_from_country',${d}.raw_data->>'shipFromCountry',${d}.raw_data->>'origin_country','')) IN ('BR','BRA','BRASIL','BRAZIL') THEN 100 ELSE 0 END) * 0.02
)`;
export const discoveryPriorityJoin = (o = 'o', d = 'd') => `LEFT JOIN LATERAL (
  SELECT rating,sales_count,commission_rate,brand_name,raw_data
  FROM affiliate_discovery_items
  WHERE account_id=${o}.account_id AND offer_id=${o}.id
    AND kind='PRODUCT'
  ORDER BY last_seen_at DESC LIMIT 1
) ${d} ON true`;