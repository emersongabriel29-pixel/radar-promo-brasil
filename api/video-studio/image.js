export const access='member';
export const methods=['GET'];
const allowed=host=>['mlstatic.com','susercontent.com','shopee.com.br','shopee.com','aliexpress-media.com','alicdn.com','media-amazon.com','mlcdn.com','kabum.com.br','shopify.com','vteximg.com.br','tcdn.com.br'].some(root=>host===root||host.endsWith('.'+root));
export default async function(req,res) {
  if(!req.member)return res.status(401).send('Não autorizado.');
  let source=String(req.query?.url||'').trim();
  for(let hop=0;hop<=3;hop++) {
    let parsed;
    try{parsed=new URL(source)}catch{return res.status(400).send('URL inválida.')}
    if(parsed.protocol!=='https:'||!allowed(parsed.hostname.toLowerCase()))return res.status(400).send('Domínio de imagem não permitido.');
    const response=await fetch(source,{redirect:'manual',headers:{Accept:'image/jpeg,image/png,image/webp'},signal:AbortSignal.timeout(12000)});
    if([301,302,303,307,308].includes(response.status)) {
      const location=response.headers.get('location');
      if(!location||hop===3)return res.status(502).send('Redirecionamento de imagem inválido.');
      source=new URL(location,source).toString();continue;
    }
    if(!response.ok)return res.status(424).send('Imagem indisponível na origem.');
    const type=String(response.headers.get('content-type')||'').split(';')[0];
    if(!['image/jpeg','image/png','image/webp'].includes(type))return res.status(415).send('Formato de imagem não suportado.');
    if(Number(response.headers.get('content-length'))>6*1024*1024){await response.body?.cancel();return res.status(413).send('Imagem excede 6 MB.');}
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(!bytes.length||bytes.length>6*1024*1024)return res.status(413).send('Imagem excede 6 MB.');
    res.setHeader('Content-Type',type);res.setHeader('Cache-Control','private, max-age=1800');
    return res.send(bytes);
  }
  return res.status(502).send('Não foi possível obter a imagem.');
}