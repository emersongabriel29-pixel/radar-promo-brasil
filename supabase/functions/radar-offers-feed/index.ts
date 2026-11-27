import postgres from "npm:postgres@3.4.7";

const ACCOUNT_SLUG = "emersongabriel29-888956";
const MAX_LIMIT = 60;
let sqlClient: ReturnType<typeof postgres> | undefined;

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30, stale-while-revalidate=60",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "accept, content-type",
      ...extra,
    },
  });
}

function boundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function getDb() {
  const connectionString = Deno.env.get("SUPABASE_DB_URL") || "";
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  if (!sqlClient) {
    sqlClient = postgres(connectionString, {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: "require",
    });
  }
  return sqlClient;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const url = new URL(request.url);
  const page = boundedInt(url.searchParams.get("page"), 1, 1, 10000);
  const limit = boundedInt(url.searchParams.get("limit"), 30, 1, MAX_LIMIT);
  if (page === null || limit === null) return json({ error: "INVALID_QUERY" }, 400);

  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const category = (url.searchParams.get("category") || "").trim().slice(0, 128);
  const id = (url.searchParams.get("id") || "").trim().slice(0, 128);
  const sort = url.searchParams.get("sort") || "recent";
  if (!["recent", "discount", "score"].includes(sort)) return json({ error: "INVALID_QUERY" }, 400);

  const params: unknown[] = [ACCOUNT_SLUG];
  const filters = [
    "a.slug = $1",
    "a.status = 'ACTIVE'",
    "o.status IN ('APPROVED', 'PUBLISHED')",
    "EXISTS (SELECT 1 FROM public.offer_price_history ph WHERE ph.account_id=o.account_id AND ph.offer_id=o.id AND ph.source_type='OFFICIAL_API' AND ph.verified_at > now()-interval '24 hours' AND ph.original_price IS NOT NULL AND ph.price=o.current_price AND ph.original_price=o.original_price AND ph.verified_at=(SELECT MAX(ph2.verified_at) FROM public.offer_price_history ph2 WHERE ph2.account_id=ph.account_id AND ph2.offer_id=ph.offer_id AND ph2.source_type='OFFICIAL_API'))",
  ];

  if (q) {
    params.push("%" + q + "%");
    filters.push("(o.title ILIKE $" + params.length + " OR o.source ILIKE $" + params.length + ")");
  }
  if (category) {
    params.push(category);
    filters.push("c.name = $" + params.length);
  }
  if (id) {
    params.push(id);
    filters.push("o.id = $" + params.length);
  }

  const orderBy = sort === "discount"
    ? "o.discount_percent DESC, o.created_at DESC"
    : sort === "score"
      ? "o.radar_score DESC, o.score DESC, o.created_at DESC"
      : "o.created_at DESC";

  params.push(limit, (page - 1) * limit);
  const limitParam = params.length - 1;
  const offsetParam = params.length;
  const statement = `
    SELECT o.id, o.title, o.source,
      o.current_price AS "currentPrice",
      o.original_price AS "originalPrice",
      o.image_url AS "imageUrl",
      o.affiliate_url AS "affiliateUrl",
      o.discount_percent AS "discountPercent",
      o.radar_score AS "radarScore",
      o.score,
      o.coupon_code AS "couponCode",
      o.created_at AS "createdAt",
      c.name AS "category",
      c.icon AS "categoryIcon",
      o.subcategory,
      COUNT(*) OVER()::int AS "__total"
    FROM public.offers o
    JOIN public.accounts a ON a.id=o.account_id
    LEFT JOIN public.categories c ON c.id=o.category_id AND c.account_id=o.account_id
    WHERE ${filters.join(" AND ")}
    ORDER BY ${orderBy}, o.id DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  try {
    const rows = await getDb().unsafe(statement, params as (string | number | boolean | null)[]);
    const total = Number(rows[0]?.__total || 0);
    const offers = rows.map((row: Record<string, unknown>) => {
      const { __total, ...offer } = row;
      const imageUrl = typeof offer.imageUrl === "string" && /^https:\/\//i.test(offer.imageUrl)
        ? offer.imageUrl : "";
      const affiliateUrl = typeof offer.affiliateUrl === "string" && /^https:\/\//i.test(offer.affiliateUrl)
        ? offer.affiliateUrl : "";
      return { ...offer, imageUrl, affiliateUrl };
    });
    return json({
      source: "Radar Promo Brasil",
      generatedAt: new Date().toISOString(),
      page,
      limit,
      total,
      hasMore: page * limit < total,
      offers,
    });
  } catch (error) {
    console.error("radar-offers-feed", String((error as Error)?.message || "DATABASE_QUERY_FAILED").slice(0, 100));
    return json({ error: "Feed temporariamente indisponível.", code: "FEED_DATABASE_ERROR" }, 503, {
      "retry-after": "60",
    });
  }
});

