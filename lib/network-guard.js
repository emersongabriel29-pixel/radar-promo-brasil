import dns from 'node:dns/promises';
import net from 'node:net';

const blocked=new net.BlockList();
for(const [net4,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(net4,prefix,'ipv4');
for(const [net6,prefix] of [['::',128],['::1',128],['64:ff9b::',96],['100::',64],['2001:db8::',32],['fc00::',7],['fe80::',10],['ff00::',8]])blocked.addSubnet(net6,prefix,'ipv6');

export function isPublicAddress(address){
  const value=String(address||'').replace(/^\[|\]$/g,'');
  const mapped=value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if(mapped)return isPublicAddress(mapped[1]);
  const family=net.isIP(value);
  return family!==0&&!blocked.check(value,family===4?'ipv4':'ipv6');
}

// Resolve antes de cada fetch, inclusive após redirects. DNS rebinding entre lookup e conexão exige um agente que fixe o IP.
export async function assertPublicHost(value,{lookup=dns.lookup}={}){
  let host;
  try{host=new URL(value).hostname.replace(/^\[|\]$/g,'');}catch{throw new Error('URL inválida.');}
  const addresses=net.isIP(host)?[{address:host}]:await lookup(host,{all:true,verbatim:true}).catch(()=>[]);
  if(!addresses.length||!addresses.every(item=>isPublicAddress(item.address)))throw new Error('Destino não permitido: o endereço não é público.');
  return true;
}
