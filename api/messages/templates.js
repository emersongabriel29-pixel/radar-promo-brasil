import { db } from 'hatchable';
import { getOrCreateAccount } from 'lib/accounts.js';
import { validateMessageTemplate, renderMessageTemplate } from 'lib/message-templates.js';

export const access = 'member';
export const methods = ['GET', 'POST', 'PUT', 'DELETE'];

const clean = (value, max = 100) => String(value ?? '').trim().slice(0, max);
const id = () => crypto.randomUUID();

export default async function(req, res) {
  if (!req.member?.id) return res.status(401).json({ error: 'Não autorizado.' });
  try {
    const account = await getOrCreateAccount(req.member);
    if (req.method === 'GET') {
      const rows = (await db.query(
        'SELECT id,name,body,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt" FROM message_templates WHERE account_id=$1 ORDER BY updated_at DESC,name',
        [account.id]
      )).rows;
      return res.json({ templates: rows, variables: ['produto','preco','preco_anterior','desconto','loja','link_afiliado','cupom','link_cupom','categoria'] });
    }

    const body = req.body || {};
    if (req.method === 'POST' || req.method === 'PUT') {
      const validated = validateMessageTemplate(body);
      if (!validated.ok) return res.status(400).json({ error: validated.error });
      const active = body.isActive !== false;
      if (req.method === 'POST') {
        const templateId = id();
        try {
          const row = (await db.query(
            'INSERT INTO message_templates(id,account_id,name,body,is_active) VALUES($1,$2,$3,$4,$5) RETURNING id,name,body,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt"',
            [templateId, account.id, validated.name, validated.body, active]
          )).rows[0];
          return res.status(201).json({ ok: true, template: row });
        } catch (error) {
          if (error.code === '23505') return res.status(409).json({ error: 'Já existe um modelo com esse nome nesta conta.' });
          throw error;
        }
      }
      const templateId = clean(body.id, 80);
      if (!templateId) return res.status(400).json({ error: 'Identificador do modelo ausente.' });
      try {
        const row = (await db.query(
          'UPDATE message_templates SET name=$1,body=$2,is_active=$3,updated_at=now() WHERE id=$4 AND account_id=$5 RETURNING id,name,body,is_active AS "isActive",created_at AS "createdAt",updated_at AS "updatedAt"',
          [validated.name, validated.body, active, templateId, account.id]
        )).rows[0];
        if (!row) return res.status(404).json({ error: 'Modelo não encontrado.' });
        return res.json({ ok: true, template: row });
      } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Já existe um modelo com esse nome nesta conta.' });
        throw error;
      }
    }

    if (req.method === 'DELETE') {
      const templateId = clean(body.id || req.query?.id, 80);
      if (!templateId) return res.status(400).json({ error: 'Identificador do modelo ausente.' });
      const deleted = await db.query('DELETE FROM message_templates WHERE id=$1 AND account_id=$2 RETURNING id', [templateId, account.id]);
      if (!deleted.rows.length) return res.status(404).json({ error: 'Modelo não encontrado.' });
      return res.json({ ok: true, id: templateId });
    }
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Já existe um modelo com esse nome nesta conta.' });
    return res.status(500).json({ error: 'Não foi possível processar os modelos de mensagem.' });
  }
}

export function previewTemplate(req, res) {
  const body = req.body || {};
  try {
    return res.json({ ok: true, preview: renderMessageTemplate(String(body.body || ''), body.values || {}) });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
