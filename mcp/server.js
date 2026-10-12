import { GoogleGenAI } from '@google/genai';
import readline from 'node:readline';

const MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY;

const tools = [
  {
    name: 'categorize_product',
    description: 'Categoriza um produto usando somente os fatos fornecidos. Não inventa preço, estoque, frete, desconto ou comissão.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 300 },
        description: { type: 'string', maxLength: 3000 },
        availableCategories: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 100 },
      },
      required: ['title', 'availableCategories'],
      additionalProperties: false,
    },
  },
  {
    name: 'generate_promo_text',
    description: 'Cria texto de promoção a partir de dados verificados. Não publica mensagens e não inventa preço, estoque, frete, cupom ou desconto.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 300 },
        verifiedFacts: { type: 'object', description: 'Somente fatos conferidos, por exemplo preço, preço anterior, cupom, validade e URL oficial.' },
        channel: { type: 'string', enum: ['whatsapp', 'telegram', 'general'] },
        tone: { type: 'string', maxLength: 100 },
      },
      required: ['title', 'verifiedFacts', 'channel'],
      additionalProperties: false,
    },
  },
];

function textResult(text) {
  return { content: [{ type: 'text', text }], isError: false };
}

function validateInput(name, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Argumentos inválidos.');
  if (name === 'categorize_product') {
    if (typeof args.title !== 'string' || !args.title.trim()) throw new Error('Informe o título do produto.');
    if (!Array.isArray(args.availableCategories) || args.availableCategories.length === 0) throw new Error('Informe as categorias permitidas.');
  }
  if (name === 'generate_promo_text') {
    if (typeof args.title !== 'string' || !args.title.trim()) throw new Error('Informe o título do produto.');
    if (!args.verifiedFacts || typeof args.verifiedFacts !== 'object' || Array.isArray(args.verifiedFacts)) throw new Error('Informe os fatos verificados.');
    if (!['whatsapp', 'telegram', 'general'].includes(args.channel)) throw new Error('Canal inválido.');
  }
}

async function callGemini(name, args) {
  if (!apiKey) throw new Error('GEMINI_API_KEY não está configurada. Configure-a no ambiente local; nunca a coloque no código ou no repositório.');
  validateInput(name, args);
  const ai = new GoogleGenAI({ apiKey });
  const instruction = name === 'categorize_product'
    ? `Escolha exclusivamente uma categoria da lista fornecida. Retorne JSON com as chaves category e reason. Se não houver correspondência, use a categoria mais próxima e explique a incerteza. Não invente atributos.\nProduto: ${args.title}\nDescrição: ${args.description || '(não fornecida)'}\nCategorias permitidas: ${JSON.stringify(args.availableCategories)}`
    : `Escreva um texto de promoção em português brasileiro para ${args.channel}. Tom: ${args.tone || 'claro e confiável'}. Use somente os fatos verificados abaixo. Não invente nem estime preço, desconto, estoque, frete, cupom, validade, comissão ou urgência. Se um fato estiver ausente, omita-o. Preserve URLs exatamente. Não afirme que a oferta foi publicada. Retorne apenas o texto final.\nProduto: ${args.title}\nFatos verificados: ${JSON.stringify(args.verifiedFacts)}`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: instruction,
    config: {
      temperature: 0.2,
      responseMimeType: name === 'categorize_product' ? 'application/json' : 'text/plain',
    },
  });
  const result = response.text?.trim();
  if (!result) throw new Error('O modelo não retornou conteúdo.');
  return textResult(result);
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

async function handle(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return;
  const { id, method, params = {} } = message;
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return;
  if (method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params.protocolVersion || '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'radar-promo-gemini-mcp', version: '0.1.0' },
      },
    });
  }
  if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools } });
  if (method === 'tools/call') {
    try {
      const name = params.name;
      const args = params.arguments || {};
      if (!tools.some(tool => tool.name === name)) throw new Error('Ferramenta desconhecida.');
      const result = await callGemini(name, args);
      return send({ jsonrpc: '2.0', id, result });
    } catch (error) {
      return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: error.message || 'Falha ao executar ferramenta.' }], isError: true } });
    }
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Método não suportado.' } });
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
for await (const line of rl) {
  if (!line.trim()) continue;
  try {
    await handle(JSON.parse(line));
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido.' } });
  }
}
