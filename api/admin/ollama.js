import { getOllamaStatus } from 'lib/ollama.js';
export const access='admin';
export const methods=['GET'];
export default async function(req,res){
  const status=await getOllamaStatus();
  return res.status(status.configured&&status.reachable?200:status.configured?503:200).json({provider:'ollama',...status,checkedAt:new Date().toISOString()});
}