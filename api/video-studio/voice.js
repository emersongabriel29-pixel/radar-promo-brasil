import { ai } from 'hatchable';
import { isSetupRequired } from 'lib/media.js';

export const access='member';
export const methods=['POST'];
const clean=(v,n=5000)=>String(v??'').trim().slice(0,n);

export default async function(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para gerar a locução.'});
  const text=clean(req.body?.text,4000),voice=['alloy','echo','fable','onyx','nova','shimmer','ash','sage','coral'].includes(clean(req.body?.voice,20))?clean(req.body.voice,20):'nova';
  if(!text)return res.status(400).json({error:'Informe o roteiro para a locução.'});
  try{
    const response=await ai.fetch({provider:'openai',path:'/v1/audio/speech',body:{model:'tts-1',voice,input:text,response_format:'mp3'},purpose:'video-studio-tts',timeoutMs:120000});
    if(!response.ok){
      const detail=await response.text().catch(()=>'');
      if(response.status===401||response.status===403)return res.status(412).json({error:'Configure uma chave própria da OpenAI em Configurações do projeto → IA para habilitar a locução automática.'});
      console.error('video-studio/voice provider',response.status,String(detail).slice(0,200));
      return res.status(502).json({error:'O provedor não conseguiu gerar a locução. Você pode gravar pelo microfone ou anexar um áudio.'});
    }
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(!bytes.length||bytes.length>8*1024*1024)return res.status(502).json({error:'O arquivo de locução retornado excedeu o limite permitido.'});
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return res.json({ok:true,mimeType:'audio/mpeg',filename:'locucao-radar.mp3',audioB64:btoa(binary),voice,notice:'Locução gerada. O uso depende da chave OpenAI configurada e pode gerar cobrança do provedor.'});
  }catch(error){
    console.error('video-studio/voice',String(error?.code||error?.message||'TTS_ERROR').slice(0,120));
    if(isSetupRequired(error))return res.status(412).json({error:'A locução automática exige uma chave própria da OpenAI. Configure em Configurações do projeto → IA.'});
    return res.status(502).json({error:'Falha ao gerar a locução. Use a gravação pelo microfone ou um arquivo de áudio.'});
  }
}