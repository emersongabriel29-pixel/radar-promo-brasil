// HTTP 200 is only the transport result; TOP operations carry a business result.
const safeCode = value => String(value ?? 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '').slice(0,60) || 'UNKNOWN';
const invalid = () => Object.assign(new Error('AliExpress retornou um envelope de resposta inválido.'), {status:502,code:'ALIEXPRESS_INVALID_RESPONSE'});
export function assertAliExpressResponse(data, method) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid();
  if (data.error_response) {
    const providerCode=safeCode(data.error_response.code ?? data.error_response.sub_code);
    throw Object.assign(new Error('AliExpress recusou a operação ('+providerCode+').'),{status:502,code:'ALIEXPRESS_API_ERROR',providerCode});
  }
  const root=data[String(method).replaceAll('.','_')+'_response'];
  if (!root || typeof root !== 'object' || Array.isArray(root)) throw invalid();
  if (root.resp_result !== undefined) {
    const result=root.resp_result;
    if (!result || typeof result !== 'object' || result.resp_code === undefined || result.resp_code === null || result.resp_code === '') throw invalid();
    if (Number(result.resp_code)!==200) {
      const providerCode=safeCode(result.resp_code);
      throw Object.assign(new Error('AliExpress recusou a operação (resultado '+providerCode+').'),{status:502,code:'ALIEXPRESS_BUSINESS_ERROR',providerCode});
    }
  } else if (root.result === undefined) throw invalid();
  return data;
}
