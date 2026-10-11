// AliExpress legacy TOP Affiliate API uses HMAC-MD5 for sign_method=hmac.
// Kept in a small module so the signature behavior can be covered by node:test.
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
function md5(input) {
  const bytes=input instanceof Uint8Array?input:new TextEncoder().encode(input), origLen=bytes.length, bitLen=origLen*8;
  const len=(((origLen+8)>>>6)<<6)+64,msg=new Uint8Array(len);msg.set(bytes);msg[origLen]=0x80;
  const dv=new DataView(msg.buffer);dv.setUint32(len-8,bitLen>>>0,true);dv.setUint32(len-4,Math.floor(bitLen/4294967296),true);
  const shifts=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const K=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0);
  let a0=0x67452301|0,b0=0xefcdab89|0,c0=0x98badcfe|0,d0=0x10325476|0;
  for(let off=0;off<len;off+=64){
    const M=new Int32Array(16);for(let i=0;i<16;i++)M[i]=dv.getInt32(off+i*4,true);
    let A=a0,B=b0,C=c0,D=d0;
    for(let i=0;i<64;i++){
      let F,g;
      if(i<16){F=(B&C)|(~B&D);g=i;}
      else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16;}
      else if(i<48){F=B^C^D;g=(3*i+5)%16;}
      else{F=C^(B|~D);g=(7*i)%16;}
      const sum=(A+F+K[i]+M[g])|0,rot=shifts[i],next=(B+((sum<<rot)|(sum>>>(32-rot))))|0;
      A=D;D=C;C=B;B=next;
    }
    a0=(a0+A)|0;b0=(b0+B)|0;c0=(c0+C)|0;d0=(d0+D)|0;
  }
  const out=new Uint8Array(16),od=new DataView(out.buffer);[a0,b0,c0,d0].forEach((v,i)=>od.setInt32(i*4,v,true));return out;
}
export function hmacMd5(data,secret){
  let key=new TextEncoder().encode(String(secret));
  if(key.length>64)key=md5(key);
  const inner=new Uint8Array(64),outer=new Uint8Array(64);
  for(let i=0;i<64;i++){const b=key[i]||0;inner[i]=b^0x36;outer[i]=b^0x5c;}
  const msg=new TextEncoder().encode(String(data)),ib=new Uint8Array(64+msg.length);ib.set(inner);ib.set(msg,64);
  const ih=md5(ib),ob=new Uint8Array(80);ob.set(outer);ob.set(ih,64);
  return hex(md5(ob)).toUpperCase();
}
export function signTopParams(params,secret){
  const base=Object.keys(params).filter(k=>params[k]!==undefined&&params[k]!==null&&String(params[k])!=='').sort().map(k=>k+String(params[k])).join('');
  return hmacMd5(base,secret);
}