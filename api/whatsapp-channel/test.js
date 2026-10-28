import { whatsappChannelHealth, checkWhatsAppChannelRole } from 'lib/whatsapp-channel.js';

export const access = 'member';
export const methods = ['POST'];

export default async function(req, res) {
  const channelLink = String(req.body?.channelLink || '').trim();
  if (!channelLink) return res.status(400).json({ error: 'Informe o link do Canal do WhatsApp para validar a conexão.' });
  try {
    const health = await whatsappChannelHealth();
    const roleResponse = await checkWhatsAppChannelRole(channelLink);
    const role = String(roleResponse?.data?.role || roleResponse?.role || '').toUpperCase();
    if (!['ADMIN', 'OWNER'].includes(role)) {
      return res.status(412).json({
        ok: false,
        apiReachable: true,
        role: role || 'UNKNOWN',
        error: 'O número conectado precisa ser administrador ou proprietário deste canal.'
      });
    }
    return res.json({
      ok: true,
      apiReachable: true,
      connected: health?.data?.whatsapp === 'connected' || health?.data?.status === 'ok' || health?.ok === true || health?.success === true,
      role,
      note: 'Permissão confirmada. Faça um envio de teste e confira a mensagem no canal antes de ativar a fila.'
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
