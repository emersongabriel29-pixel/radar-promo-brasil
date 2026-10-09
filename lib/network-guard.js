import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import { Readable } from 'node:stream';

const blocked=new net.BlockList();
for(const [net4,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(net4,prefix,'ipv4');
for(const [net6,prefix] of [['::',128],['::1',128],['64:ff9b::',96],['100::',64],['2001::',23],['2001:db8::',32],['fc00::',7],['fe80::',10],['ff00::',8]])blocked.addSubnet(net6,prefix,'ipv6');

function mappedIpv4(value){
  let raw=String(value||'').toLowerCase();
  const dotted=raw.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if(dotted){const octets=dotted[1].split('.').map(Number);if(octets.some(n=>n<0||n>255))return null;const hex1=((octets[0]<<8)|octets[1]).toString(16);const hex2=((octets[2]<<8)|octets[3]).toString(16);raw=raw.slice(0,-dotted[1].length)+hex1+':'+hex2;}
  const halves=raw.split('::');if(halves.length>2)return null;const left=halves[0]?halves[0].split(':'):[];const right=halves.length===2&&halves[1]?halves[1].split(':'):[];const missing=8-left.length-right.length;
  if((halves.length===1&&missing!==0)||(halves.length===2&&missing<1))return null;
  const groups=[...left,...Array(missing).fill('0'),...right].map(group=>parseInt(group||'0',16));
  if(groups.length!==8||groups.some(n=>!Number.isInteger(n)||n<0||n>65535))return null;
  if(groups.slice(0,5).some(n=>n!==0)||groups[5]!==65535)return null;
  return [groups[6]>>8,groups[6]&255,groups[7]>>8,groups[7]&255].join('.');
}
export function isPublicAddress(address){
  const value=String(address||'').replace(/^\[|\]$/g,'');const family=net.isIP(value);
  if(family===4)return !blocked.check(value,'ipv4');
  if(family===6){if(mappedIpv4(value))return false;return !blocked.check(value,'ipv6');}
  return false;
}
export async function resolvePublicHost(value,{lookup=dns.lookup}={}){
  let host;try{host=new URL(value).hostname.replace(/^\[|\]$/g,'');}catch{throw new Error('URL inválida.');}
  const addresses=net.isIP(host)?[{address:host}]:await lookup(host,{all:true,verbatim:true}).catch(()=>[]);
  if(!addresses.length||!addresses.every(item=>isPublicAddress(item.address)))throw new Error('Destino não permitido: o endereço não é público.');
  return {host,address:addresses[0].address,family:net.isIP(addresses[0].address)};
}

// Absolute deadline covers DNS lookup, connection, headers, and the full response body.
export async function fetchPinnedHttps(value,{lookup=dns.lookup,requestImpl=https.request,timeout=8000}={}){
  let parsed;try{parsed=new URL(value);}catch{throw new Error('URL inválida.');}
  if(parsed.protocol!=='https:')throw new Error('Somente HTTPS é permitido.');
  if(!Number.isFinite(timeout)||timeout<=0)throw new Error('Tempo limite inválido.');

  let timer;let request;let settled=false;let responseStarted=false;
  const deadlineError=()=>new Error('Tempo limite absoluto ao consultar o feed.');
  const responsePromise=new Promise((resolve,reject)=>{
    const fail=error=>{
      if(settled)return;
      settled=true;clearTimeout(timer);request?.destroy(error);reject(error);
    };
    timer=setTimeout(()=>{
      const error=deadlineError();
      request?.destroy(error);
      if(!settled){settled=true;reject(error);}
    },timeout);
    try{
      resolvePublicHost(parsed.toString(),{lookup}).then(pinned=>{
        if(settled)return;
        try{
          request=requestImpl(parsed,{
            method:'GET',
            headers:{Accept:'application/json'},
            lookup:(_hostname,options,callback)=>{
              if(typeof options==='function')callback=options;
              callback(null,pinned.address,pinned.family);
            }
          },incoming=>{
            if(settled){incoming.destroy();return;}
            responseStarted=true;settled=true;
            const status=incoming.statusCode||0;
            const body=incoming.statusCode===204||incoming.statusCode===304?null:Readable.toWeb(incoming);
            resolve({status,ok:status>=200&&status<300,headers:{get:name=>incoming.headers?.[String(name).toLowerCase()]??null},body});
          });
          request.on('error',error=>{if(!responseStarted)fail(error);});
          request.end();
        }catch(error){fail(error);}
      }).catch(fail);
    }catch(error){fail(error);}
  });

  let response;
  try{response=await responsePromise;}catch(error){clearTimeout(timer);throw error;}
  if(!response.body){clearTimeout(timer);return response;}
  const reader=response.body.getReader();
  const timedBody=new ReadableStream({
    async pull(controller){
      try{
        const item=await reader.read();
        if(item.done){clearTimeout(timer);controller.close();return;}
        controller.enqueue(item.value);
      }catch(error){clearTimeout(timer);controller.error(error);}
    },
    async cancel(reason){
      clearTimeout(timer);
      request?.destroy();
      try{await reader.cancel(reason);}catch{}
    }
  });
  return {...response,body:timedBody};
}
export async function assertPublicHost(value,options={}){await resolvePublicHost(value,options);return true;}
