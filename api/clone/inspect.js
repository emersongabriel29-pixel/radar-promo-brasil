import { db } from 'hatchable';

export const access = 'member';
export const methods = ['POST'];

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const HOSTS = {
  whatsapp: new Set(['chat.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com']),
  telegram: new Set(['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me']),
  collshp: new Set(['collshp.com', 'www.collshp.com']),
  magalu: new Set(['magazinevoce.com.br', 'www.magazinevoce.com.br', 'magazineluiza.com.br', 'www.magazineluiza.com.br', 'magazineluiza.onelink.me']),
  shopee: new Set(['shopee.com.br', 'www.shopee.com.br', 'shopee.com', 'shope.ee', 's.shopee.com.br']),
  mercadolivre: new Set(['mercadolivre.com.br', 'www.mercadolivre.com.br', 'mercadolivre.com', 'meli.la']),
  amazon: new Set(['amazon.com.br', 'www.amazon.com.br', 'amzn.to']),
  aliexpress: new Set(['aliexpress.com', 'www.aliexpress.com', 'a.aliexpress.com']),
  shein: new Set(['shein.com', 'www.shein.com', 'br.shein.com']),
};
function parseUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim().slice(0, 2000)); }
  catch { throw fail('Cole uma URL completa e válida.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hostname.includes('.local') || url.hostname === 'localhost' || /^\d+(\.\d+){3}$/.test(url.hostname)) {
    throw fail('Por segurança, use um link público HTTPS válido.');
  }
  return url;
}
function matchHost(url, list) { return list.has(url.hostname.toLowerCase()); }
function detect(url) {
  if (matchHost(url, HOSTS.whatsapp) && /^\/(?:[A-Za-z0-9_-]{10,}|invite\/)/.test(url.pathname)) return 'WHATSAPP_INVITE';
  if (matchHost(url, HOSTS.telegram) && (/^\/(?:\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+)$/.test(url.pathname) || /^\/[A-Za-z0-9_]{4,}(?:\/\d+)?$/.test(url.pathname))) return 'TELEGRAM_LINK';
  if (matchHost(url, HOSTS.collshp)) return 'COLLSHP_STOREFRONT';
  if (matchHost(url, HOSTS.magalu)) return 'MAGALU_PUBLIC_PAGE';
  if (matchHost(url, HOSTS.shopee)) return 'SHOPEE_AFFILIATE_OR_PRODUCT';
  if (matchHost(url, HOSTS.mercadolivre)) return 'MERCADOLIVRE_AFFILIATE_OR_PRODUCT';
  if (matchHost(url, HOSTS.amazon)) return 'AMAZON_AFFILIATE_OR_PRODUCT';
  if (matchHost(url, HOSTS.aliexpress)) return 'ALIEXPRESS_AFFILIATE_OR_PRODUCT';
  if (matchHost(url, HOSTS.shein)) return 'SHEIN_AFFILIATE_OR_PRODUCT';
  return 'PUBLIC_URL';
}
export default async function handler(req, res) {
  if (!req.member) return res.status(401).json({ ok: false, error: 'Entre para usar o Modo Clone.' });
  try {
    const url = parseUrl(req.body?.url);
    const kind = detect(url);
    const originalUrl = url.toString();
    const common = { ok: true, kind, originalUrl, host: url.hostname, trackingParametersPreserved: true, canPublish: false };
    if (kind === 'WHATSAPP_INVITE') {
      return res.json({ ...common, status: 'INVITE_FORMAT_RECOGNIZED', platform: 'WHATSAPP', title: 'Convite de grupo WhatsApp', importMode: 'AUTHORIZED_CONNECTION_REQUIRED', message: 'O convite foi reconhecido pelo formato. A API oficial do WhatsApp não permite consultar membros ou mensagens de um grupo apenas pelo convite. Para importar conteúdo, conecte uma sessão/conector autorizado ao grupo; nenhum grupo foi acessado automaticamente.', nextStep: 'Cadastre o destino como pausado e conclua a conexão autorizada antes de ativar a captura.' });
    }
    if (kind === 'TELEGRAM_LINK') {
      const privateInvite = /\/\+|\/joinchat\//i.test(url.pathname);
      return res.json({ ...common, status: 'LINK_RECOGNIZED', platform: 'TELEGRAM', title: privateInvite ? 'Convite privado do Telegram' : 'Link público do Telegram', importMode: 'BOT_OR_AUTHORIZED_SESSION_REQUIRED', message: privateInvite ? 'O formato do convite foi reconhecido. A Bot API não permite ler o histórico privado apenas com o convite; adicione um bot autorizado ao grupo/canal ou conecte uma sessão autorizada.' : 'O link público foi reconhecido. Para importar mensagens novas, adicione o bot ao canal/grupo com as permissões necessárias e valide o webhook. A leitura de histórico depende do tipo de origem e das permissões.', nextStep: 'Validar a conexão Telegram e o webhook antes de ativar a captura.' });
    }
    if (kind === 'COLLSHP_STOREFRONT') {
      return res.json({ ...common, status: 'DEDICATED_IMPORT_AVAILABLE', title: 'Vitrine Collshp', importEndpoint: '/api/integrations/collshp-import', message: 'Use a importação Collshp dedicada para listar os produtos públicos; os links são candidatos e a comissão precisa ser verificada no programa oficial.' });
    }
    if (kind === 'MAGALU_PUBLIC_PAGE') {
      return res.json({ ...common, status: 'DEDICATED_IMPORT_AVAILABLE', title: 'Produto ou vitrine Magazine Luiza', importEndpoint: '/api/integrations/magalu-clone', message: 'Use a importação específica da página pública Magalu. O link de afiliado e a comissão não são comprovados só pela leitura.' });
    }
    const marketplace = kind.endsWith('_AFFILIATE_OR_PRODUCT') ? kind.split('_')[0] : '';
    if (marketplace) {
      return res.json({ ...common, status: 'LINK_RECOGNIZED', title: 'Link de produto ou afiliado', marketplace, affiliateStatus: 'UNVERIFIED', message: 'Link reconhecido e preservado integralmente, incluindo parâmetros de rastreamento. A validade do afiliado, a comissão e o preço não são confirmados apenas pelo domínio.', nextStep: 'Use a integração oficial da loja ou confira o link no painel do programa de afiliados.' });
    }
    return res.json({ ...common, status: 'PUBLIC_URL_UNSUPPORTED_FOR_AUTOMATIC_IMPORT', title: 'Link HTTPS recebido', message: 'O link é HTTPS, mas este domínio não tem importador dedicado. Não será feita captura genérica para evitar SSRF e dados falsos.', nextStep: 'Use uma integração autorizada ou um feed público oficial.' });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, error: error.status ? error.message : 'Não foi possível analisar o link.' });
  }
}