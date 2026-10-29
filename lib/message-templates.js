const TOKENS = new Set(['produto','preco','preco_anterior','desconto','loja','link_afiliado','cupom','link_cupom','categoria']);
const clean = (value, max) => String(value ?? '').trim().slice(0, max);

export function validateMessageTemplate(input = {}) {
  const name = clean(input.name, 80);
  const body = clean(input.body, 3000);
  if (!name) return { ok: false, error: 'Informe o nome do modelo.' };
  if (!body) return { ok: false, error: 'Informe o texto do modelo.' };
  if (name.length > 80 || body.length > 3000) return { ok: false, error: 'O modelo excede o limite permitido.' };
  const tokens = [...body.matchAll(/{{\s*([a-zA-Z_]+)\s*}}/g)].map(match => match[1].toLowerCase());
  const unknown = [...new Set(tokens.filter(token => !TOKENS.has(token)))];
  if (unknown.length) return { ok: false, error: 'Variável não reconhecida: ' + unknown.map(token => '{{' + token + '}}').join(', ') };
  if (/{{|}}/.test(body.replace(/{{\s*[a-zA-Z_]+\s*}}/g, ''))) return { ok: false, error: 'Há uma variável incompleta ou inválida.' };
  return { ok: true, name, body, tokens: [...new Set(tokens)] };
}

export function renderMessageTemplate(body, values = {}) {
  const validated = validateMessageTemplate({ name: 'Prévia', body });
  if (!validated.ok) throw new Error(validated.error);
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value ?? '')]));
  return body.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (_match, token) => normalized[token.toLowerCase()] ?? '');
}
