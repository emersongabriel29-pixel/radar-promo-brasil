import { whatsappChannelHealth, checkWhatsAppChannelRole } from 'lib/whatsapp-channel.js';

export const access = 'member';
export const methods = ['POST'];

export default async function(req, res) {
  const channelLink = String(req.body?.channelLink || '').trim();
  if (!channelLink) return res.status(400).json({ error: 'Informe o link do Canal do WhatsApp para validar a conexão.' });
  try {
    const health = await whatsappChannelHealth();
    const role = await checkWhatsAppChannelRole(channelLink);
    return res.json({
      ok: true,
      apiReachable: true,
      connected: health?.ok !== false,
      role,
      note: 'Conexão verificada. Antes de ativar a fila, faça um envio manual de teste e confirme a mensagem no canal.'
    });
  } catch (error) {
    const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 502;
    return res.status(status).json({
      ok: false,
      error: String(error?.message || 'Não foi possível validar a API/canal.').slice(0, 300),
      code: String(error?.code || 'WHATSAPP_CONNECTION_FAILED').slice(0, 80)
    });
  }
}
