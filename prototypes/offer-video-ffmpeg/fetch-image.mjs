import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { resolve, extname } from 'node:path';
import { writeFile } from 'node:fs/promises';
const MAX_IMG=8*1024*1024, MAX_HTML=2*1024*1024, MAX_REDIRECTS=5;
function private4(ip){const p=ip.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return true;const[a,b]=p;return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===192&&b===0)||(a===198&&(b===18||b===19||b===51))||(a===203&&b===0);}
function private6(ip){
  const v=ip.toLowerCase().split('%')[0];
  // Parse IPv6 first so special and mapped forms are rejected before public-range checks.
  const parts=v.split('::');
  if(parts.length>2) return true;
  const expand=part=>part?part.split(':'): [];
  const left=expand(parts[0]), right=expand(parts[1]||'');
  const full=[...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right];
  if(full.length!==8) return true;
  const words=full.map(x=>parseInt(x||'0',16));
  if(words.some(x=>!Number.isInteger(x)||x<0||x>0xffff)) return true;
  if(words.every(x=>x===0)||(words.slice(0,7).every(x=>x===0)&&words[7]===1)) return true;
  // IPv4-mapped IPv6 (including hexadecimal and dotted-decimal forms).
  if(words.slice(0,5).every(x=>x===0)&&words[5]===0xffff){
    const a=words[6], b=words[7];
    return private4([(a>>8)&255,a&255,(b>>8)&255,b&255].join('.'));
  }
  // Documentation-only IPv6 prefix is not a public destination.
  if(words[0]===0x2001&&words[1]===0x0db8) return true;
  // Only globally routable IPv6 unicast (2000::/3) is allowed.
  if(words[0]<0x2000||words[0]>0x3fff) return true;
  return false;
}
async function resolvePublicTarget(value){
  let u; try { u=new URL(value); } catch { throw new Error('Informe um link HTTP/HTTPS válido.'); }
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password) throw new Error('A origem deve ser HTTP/HTTPS pública, sem credenciais.');
  const host=u.hostname.replace(/^\[|\]$/g,'').toLowerCase();
  if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host==='metadata.google.internal') throw new Error('Endereços locais/internos não são permitidos.');
  const family=isIP(host);
  const ips=family?[{address:host,family}]:await lookup(host,{all:true,verbatim:true}).catch(()=>[]);
  if(!ips.length) throw new Error('Não foi possível resolver o domínio.');
  for(const x of ips) if((x.family===4&&private4(x.address))||(x.family===6&&private6(x.address))) throw new Error('Link para endereço privado/reservado bloqueado.');
  return { url:u, address:ips[0].address, family:ips[0].family };
}
export async function assertPublicHttpUrl(value){ return (await resolvePublicTarget(value)).url; }

// The socket uses the exact IP that was validated; no second DNS lookup occurs.
// The original hostname remains in use for Host, TLS SNI, and certificate validation.
export function requestPinned(target,accept,max){
  return new Promise((resolve,reject)=>{
    const {url,address,family}=target, transport=url.protocol==='https:'?https:http;
    let settled=false, size=0; const chunks=[];
    const finish=(fn,value)=>{if(!settled){settled=true;fn(value);}};
    const req=transport.request(url,{
      method:'GET',
      headers:{'user-agent':'RadarPromoBrasil-OfferVideoPrototype/1.0',accept},
      lookup:(_hostname,_options,callback)=>callback(null,address,family),
      timeout:12000,
    },res=>{
      const status=res.statusCode||0, headers=res.headers;
      if([301,302,303,307,308].includes(status)){res.resume();finish(resolve,{status,headers,bytes:new Uint8Array(),url:url.href});return;}
      if(status<200||status>=300){res.resume();finish(reject,new Error(`O link respondeu HTTP ${status}.`));return;}
      if(Number(headers['content-length']||0)>max){res.destroy();finish(reject,new Error('Conteúdo remoto acima do limite.'));return;}
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>max){res.destroy();finish(reject,new Error('Conteúdo remoto acima do limite.'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>finish(resolve,{status,headers,bytes:new Uint8Array(Buffer.concat(chunks)),url:url.href}));
      res.on('error',err=>finish(reject,err));
    });
    req.on('timeout',()=>req.destroy(new Error('Tempo limite ao acessar o link remoto.')));
    req.on('error',err=>finish(reject,err));
    req.end();
  });
}
async function safeFetch(start,accept,max){
  let current=start;
  for(let hop=0;hop<=MAX_REDIRECTS;hop++){
    const target=await resolvePublicTarget(current);
    const r=await requestPinned(target,accept,max);
    if([301,302,303,307,308].includes(r.status)){
      const loc=r.headers.location;
      if(!loc||hop===MAX_REDIRECTS) throw new Error('Redirecionamentos inválidos/excessivos.');
      current=new URL(loc,current).href; continue;
    }
    return {response:{status:r.status,headers:{get:name=>String(r.headers[String(name).toLowerCase()]||'')}},bytes:r.bytes,url:r.url};
  }
  throw new Error('Não foi possível abrir o link.');
}
const decode=s=>s.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
export function extractOfferMetadata(html,pageUrl){const metas=[];for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');const k=(a.property||a.name||a.itemprop||'').toLowerCase();if(k&&a.content)metas.push([k,a.content]);}const get=(...keys)=>metas.find(([k])=>keys.includes(k))?.[1]||'';const t=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);const title=get('og:title','twitter:title','product:name')||(t?decode(t[1].replace(/<[^>]*>/g,' ').trim()):'');const image=get('og:image','og:image:url','twitter:image','twitter:image:src','product:image','image');return{title:title.replace(/\s+/g,' ').trim().slice(0,120),imageUrl:image?new URL(image,pageUrl).href:''};}
function ext(type,url){const t=(type||'').split(';')[0].trim().toLowerCase();if(['image/jpeg','image/jpg'].includes(t))return'.jpg';if(t==='image/png')return'.png';if(t==='image/webp')return'.webp';const e=extname(new URL(url).pathname).toLowerCase();if(['.jpg','.jpeg','.png','.webp'].includes(e))return e;throw new Error('Origem não forneceu PNG, JPEG ou WebP reconhecível.');}
function validSig(b,e){if(e==='.png')return b.length>8&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;if(e==='.jpg'||e==='.jpeg')return b.length>3&&b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217;if(e==='.webp')return b.length>12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';return false;}
export async function fetchOfferImage({offerUrl='',imageUrl='',dir}){if(Boolean(offerUrl)===Boolean(imageUrl))throw new Error('Informe exatamente uma origem: --offer-url ou --image-url.');let src=imageUrl,title='';if(offerUrl){const p=await safeFetch(offerUrl,'text/html,application/xhtml+xml',MAX_HTML);const ct=(p.response.headers.get('content-type')||'').toLowerCase();if(!ct.includes('text/html')&&!ct.includes('application/xhtml+xml'))throw new Error('Link não retornou página HTML.');const m=extractOfferMetadata(new TextDecoder().decode(p.bytes),p.url);src=m.imageUrl;title=m.title;if(!src)throw new Error('Não encontrei og:image/twitter:image; use --image-url com a imagem da API.');}const img=await safeFetch(src,'image/png,image/jpeg,image/webp',MAX_IMG),e=ext(img.response.headers.get('content-type'),img.url);if(!validSig(img.bytes,e))throw new Error('Arquivo não corresponde à imagem declarada.');const imagePath=resolve(dir,`offer-image${e}`);await writeFile(imagePath,img.bytes,{flag:'wx'});return{imagePath,title,imageUrl:img.url,bytes:img.bytes.byteLength};}
