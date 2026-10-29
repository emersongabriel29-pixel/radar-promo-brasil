import { db } from 'hatchable';
import { configuredBotToken, telegramCall } from 'lib/telegram.js';

export const access = 'member';
export const methods = ['POST'];

export default async function handler(req, res) {
  try {
    if (!req.member?.id) return res.status(401).json({ ok: false, error: 'Entre para diagnosticar o Telegram.' });
    const account = (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1", [String(req.member.id)])).rows[0];
    if (!account) return res.status(404).json({ ok: false, error: 'Conta ativa não encontrada.' });
    const groupId = String(req.body?.groupId || '').trim();
    if (!groupId) return res.status(400).json({ ok: false, error: 'Informe o grupo Telegram cadastrado.' });
    const group = (await db.query("SELECT id, name, external_id AS \"externalId\", status FROM promo_groups WHERE id=$1 AND account_id=$2 AND platform='TELEGRAM' LIMIT 1", [groupId, account.id])).rows[0];
    if (!group || group.status !== 'ACTIVE' || !group.externalId) return res.status(404).json({ ok: false, error: 'Grupo Telegram ativo não encontrado nesta conta.' });
    const connection = (await db.query("SELECT id, secret_slot AS \"secretSlot\" FROM telegram_connections WHERE account_id=$1 AND status='ACTIVE' ORDER BY failure_count,priority,last_seen_at DESC NULLS LAST LIMIT 1", [account.id])).rows[0];
    if (!connection) return res.status(412).json({ ok: false, error: 'Nenhum bot ativo conectado.' });
    const token = await configuredBotToken(connection.secretSlot, account.id);
    const bot = await telegramCall(token, 'getMe', {});
    let chat = null, membership = null, membershipError = '';
    try {
      chat = await telegramCall(token, 'getChat', { chat_id: group.externalId });
    } catch (error) {
      return res.status(502).json({ ok: false, bot: { id: bot.id, username: bot.username, canJoinGroups: bot.can_join_groups }, chat: null, membership: null, error: String(error?.message || 'O bot não consegue acessar o grupo cadastrado.').slice(0, 240), sentMessage: false });
    }
    try {
      membership = await telegramCall(token, 'getChatMember', { chat_id: group.externalId, user_id: bot.id });
    } catch (error) {
      membershipError = String(error?.message || 'Não foi possível verificar a permissão do bot.').slice(0, 240);
    }
    const isAdmin = ['administrator', 'creator'].includes(membership?.status);
    const canPost = chat.type === 'channel' ? (isAdmin && membership?.can_post_messages !== false) : ['member', 'administrator', 'creator'].includes(membership?.status);
    return res.json({
      ok: true,
      sentMessage: false,
      bot: { id: bot.id, username: bot.username, canJoinGroups: bot.can_join_groups, canReadAllGroupMessages: bot.can_read_all_group_messages },
      chat: { id: chat.id, title: chat.title || chat.username || group.name, type: chat.type, username: chat.username || null },
      membership: membership ? { status: membership.status, isAdmin, canPostMessages: membership.can_post_messages ?? null, canSendMessages: membership.can_send_messages ?? null, canPost } : null,
      membershipError: membershipError || null,
      readyForDelivery: Boolean(canPost),
      checks: { botTokenValid: true, groupAccessible: true, membershipChecked: Boolean(membership), postingPermission: Boolean(canPost) }
    });
  } catch (error) {
    return res.status(502).json({ ok: false, sentMessage: false, error: String(error?.message || 'Falha no diagnóstico somente leitura do Telegram.').slice(0, 240) });
  }
}