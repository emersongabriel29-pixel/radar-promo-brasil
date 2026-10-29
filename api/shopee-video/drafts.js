import { db } from 'hatchable';

export const access = 'member';
export const methods = ['GET', 'POST', 'DELETE'];

const clean = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const validProductUrl = value => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      host === 'shopee.com.br' || host.endsWith('.shopee.com.br') ||
      host === 'shope.ee' || host.endsWith('.shope.ee') ||
      host === 'shopee.com' || host.endsWith('.shopee.com')
    );
  } catch { return false; }
};
const validImageUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:'; }
  catch { return false; }
};
async function accountFor(member) {
  return (await db.query(
    "SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",
    [String(member.id)]
  )).rows[0];
}
function shape(row) {
  return {
    id: row.id, productTitle: row.product_title, productUrl: row.product_url,
    productImageUrl: row.product_image_url, caption: row.caption, script: row.script,
    videoAssetUrl: row.video_asset_url, status: row.status,
    publicationEnabled: false, createdAt: row.created_at, updatedAt: row.updated_at
  };
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ error: 'Entre para acessar os rascunhos.' });
  const account = await accountFor(req.member);
  if (!account) return res.status(412).json({ error: 'Abra o painel do Radar uma vez para inicializar sua conta.' });

  if (req.method === 'GET') {
    const rows = (await db.query(
      'SELECT id,product_title,product_url,product_image_url,caption,script,video_asset_url,status,created_at,updated_at FROM shopee_video_drafts WHERE account_id=$1 ORDER BY created_at DESC LIMIT 100',
      [account.id]
    )).rows;
    return res.json({ drafts: rows.map(shape), publicationEnabled: false, note: 'Fila de rascunhos somente. Nenhuma API de publicação é chamada.' });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const productTitle = clean(body.productTitle, 220);
    const productUrl = clean(body.productUrl, 2000);
    const productImageUrl = clean(body.productImageUrl, 2000);
    const caption = clean(body.caption, 2200);
    const script = clean(body.script, 12000);
    const videoAssetUrl = clean(body.videoAssetUrl, 2000);
    if (!productTitle || !productUrl || !script) {
      return res.status(400).json({ error: 'Informe o título do produto, o link do produto e o roteiro.' });
    }
    if (!validProductUrl(productUrl)) {
      return res.status(400).json({ error: 'Use um link HTTPS de shopee.com.br, shope.ee ou shopee.com.' });
    }
    if (productImageUrl && !validImageUrl(productImageUrl)) {
      return res.status(400).json({ error: 'A imagem deve usar uma URL HTTPS. Use a imagem original do anúncio, sem substituí-la por uma imagem inventada.' });
    }
    if (videoAssetUrl && !validImageUrl(videoAssetUrl)) {
      return res.status(400).json({ error: 'O arquivo de vídeo deve usar uma URL HTTPS válida.' });
    }
    const id = crypto.randomUUID();
    const row = (await db.query(
      "INSERT INTO shopee_video_drafts (id,account_id,product_title,product_url,product_image_url,caption,script,video_asset_url,status,publication_enabled) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'DRAFT',FALSE) RETURNING id,product_title,product_url,product_image_url,caption,script,video_asset_url,status,created_at,updated_at",
      [id, account.id, productTitle, productUrl, productImageUrl, caption, script, videoAssetUrl]
    )).rows[0];
    return res.status(201).json({ ok: true, draft: shape(row), publicationEnabled: false, note: 'Rascunho salvo. Nenhum vídeo foi enviado à Shopee e nada foi publicado.' });
  }

  if (req.method === 'DELETE') {
    const id = clean(req.query?.id, 80);
    if (!id) return res.status(400).json({ error: 'Informe o ID do rascunho.' });
    const result = await db.query(
      "DELETE FROM shopee_video_drafts WHERE id=$1 AND account_id=$2 AND status='DRAFT' RETURNING id",
      [id, account.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Rascunho não encontrado ou não pode ser excluído.' });
    return res.json({ ok: true, id, publicationEnabled: false });
  }
  return res.status(405).json({ error: 'Método não permitido.' });
}