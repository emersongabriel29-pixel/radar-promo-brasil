export function offerIdentifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)) throw new Error('Oferta inválida. Volte ao aplicativo.');
  return value;
}
export function communityPath(offerId) {
  return '/community.html?section=offer&offerId=' + encodeURIComponent(offerIdentifier(offerId));
}
export function message(error) {
  if (error?.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (error?.status === 403) return 'Acesso não autorizado. Verifique a conta e a visibilidade do aplicativo.';
  if (error?.status === 429 || error?.status === 503) return 'Serviço temporariamente limitado. Aguarde e tente novamente.';
  if (error?.status === 404) return 'O conteúdo não está mais disponível.';
  return error?.safeMessage || 'Não foi possível concluir. Verifique sua conexão e tente novamente.';
}
export async function request(path, {method = 'GET', body, fetcher = fetch} = {}) {
  // Project-owned API only; never forward the session to an arbitrary URL.
  if (!/^\/api\/(account|favorites|votes|notifications|offers|comments)(\/|\?|$)/.test(path) || /[\\\r\n]/.test(path)) throw new Error('INVALID_API_PATH');
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetcher(path, {method, credentials:'same-origin', cache:'no-store', redirect:'error', signal:abort.signal,
      headers:{Accept:'application/json', ...(body === undefined ? {} : {'Content-Type':'application/json'})},
      ...(body === undefined ? {} : {body:JSON.stringify(body)})});
    if (!response.ok) throw Object.assign(new Error('API_ERROR'), {status:response.status});
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID_RESPONSE');
    return await response.json();
  } finally { clearTimeout(timer); }
}
