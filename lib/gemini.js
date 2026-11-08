import { config } from 'hatchable';

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

function toPart(part) {
  if (typeof part === 'string') return { text: part };
  if (!part || typeof part !== 'object') return { text: '' };
  if (part.type === 'text' || typeof part.text === 'string') return { text: String(part.text || '') };
  if (part.type === 'image' && part.data) {
    return { inlineData: { mimeType: part.mime_type || part.mimeType || 'image/jpeg', data: String(part.data) } };
  }
  if (part.inlineData) return { inlineData: part.inlineData };
  if (part.fileData) return { fileData: part.fileData };
  return { text: '' };
}

function normalizeContents(options) {
  if (Array.isArray(options.contents)) return options.contents;
  if (Array.isArray(options.messages)) {
    return options.messages
      .filter(message => message && message.role !== 'system')
      .map(message => ({
        role: message.role === 'assistant' || message.role === 'model' ? 'model' : 'user',
        parts: (Array.isArray(message.content) ? message.content : [message.content]).map(toPart)
      }));
  }
  return [{ role: 'user', parts: [{ text: String(options.prompt || '') }] }];
}

function normalizeTools(tools) {
  if (!tools || typeof tools !== 'object') return [];
  const functionDeclarations = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: clean(tool?.description, 1000),
    parameters: tool?.inputSchema || { type: 'object', properties: {} }
  }));
  return functionDeclarations.length ? [{ functionDeclarations }] : [];
}

export async function generateGeminiText(options = {}) {
  const key = String(await config.get('GEMINI_API_KEY') || '').trim();
  if (!key) throw Object.assign(new Error('GEMINI_API_KEY não configurada.'), { code: 'SETUP_REQUIRED' });

  const requestedModel = clean(options.model, 100);
  const model = ['gemini', 'gemini-flash', 'gemini-flash-lite', ''].includes(requestedModel)
    ? DEFAULT_MODEL
    : (/^gemini-[a-z0-9.-]+$/i.test(requestedModel) ? requestedModel : DEFAULT_MODEL);
  const maxOutputTokens = Math.max(32, Math.min(8192, Number(options.maxTokens) || 1024));
  const contents = normalizeContents(options);
  const tools = normalizeTools(options.tools);
  const toolMap = options.tools || {};
  const maxSteps = Math.max(1, Math.min(8, Number(options.maxSteps) || 1));
  const signal = options.signal || AbortSignal.timeout(25000);
  const generationConfig = { maxOutputTokens };
  if (Number.isFinite(Number(options.temperature))) generationConfig.temperature = Math.max(0, Math.min(2, Number(options.temperature)));
  if (options.responseMimeType) generationConfig.responseMimeType = clean(options.responseMimeType, 80);

  let lastData = null;
  let steps = 0;
  while (steps <= maxSteps) {
    const body = {
      contents,
      generationConfig,
      ...(options.system ? { systemInstruction: { parts: [{ text: clean(options.system, 12000) }] } } : {}),
      ...(tools.length ? { tools } : {})
    };
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = clean(data?.error?.message || 'Falha na API Gemini (HTTP ' + response.status + ').', 400);
      const code = response.status === 429 ? 'RATE_LIMIT' : response.status === 401 || response.status === 403 ? 'GEMINI_AUTH_INVALID' : 'GEMINI_API_ERROR';
      throw Object.assign(new Error(message), { status: response.status, code });
    }

    lastData = data;
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter(part => part.functionCall?.name);
    if (functionCalls.length && Object.keys(toolMap).length) {
      contents.push(candidate.content);
      const functionResponses = [];
      for (const part of functionCalls) {
        const call = part.functionCall;
        const tool = toolMap[call.name];
        if (!tool?.execute) {
          functionResponses.push({ functionResponse: { name: call.name, response: { error: 'Ferramenta não permitida.' } } });
          continue;
        }
        let result;
        try {
          result = await tool.execute(call.args || {});
        } catch (error) {
          result = { error: clean(error?.message || 'Falha ao executar consulta.', 300) };
        }
        functionResponses.push({ functionResponse: { name: call.name, response: { result } } });
      }
      contents.push({ role: 'user', parts: functionResponses });
      steps++;
      continue;
    }

    const text = parts.filter(part => typeof part.text === 'string').map(part => part.text).join('').trim();
    if (!text) {
      const reason = candidate?.finishReason || data.promptFeedback?.blockReason || 'EMPTY_RESPONSE';
      throw Object.assign(new Error('Gemini não retornou texto utilizável (' + reason + ').'), { code: 'GEMINI_EMPTY_RESPONSE' });
    }
    const finishReason = candidate?.finishReason === 'MAX_TOKENS' ? 'length' : candidate?.finishReason === 'STOP' ? 'stop' : candidate?.finishReason || null;
    console.log('gemini-call', JSON.stringify({
      purpose: clean(options.purpose, 80),
      model: data.modelVersion || model,
      inputTokens: Number(data.usageMetadata?.promptTokenCount) || 0,
      outputTokens: Number(data.usageMetadata?.candidatesTokenCount) || 0,
      steps
    }));
    return {
      text,
      model: data.modelVersion || model,
      finishReason,
      steps,
      usage: data.usageMetadata || null
    };
  }
  throw Object.assign(new Error('Gemini atingiu o limite de etapas de ferramentas.'), { code: 'GEMINI_MAX_STEPS' });
}