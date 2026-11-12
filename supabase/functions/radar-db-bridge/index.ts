// @ts-nocheck
import postgres from "postgres";
const encoder = new TextEncoder();
const MAX_BODY_BYTES = 1_000_000, MAX_SQL_BYTES = 64_000, MAX_OPERATIONS = 25;
let client;
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function equalConstantTime(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function hex(bytes){return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function verifySignature(rawBody,req,secret){
 const timestamp=req.headers.get("x-radar-timestamp")||"",nonce=req.headers.get("x-radar-nonce")||"",signature=(req.headers.get("x-radar-signature")||"").toLowerCase();
 if(!/^\d{13}$/.test(timestamp)||!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature)||Math.abs(Date.now()-Number(timestamp))>60_000)return null;
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const digest=await crypto.subtle.sign("HMAC",key,encoder.encode(timestamp+"."+nonce+"."+rawBody));
 return equalConstantTime(hex(digest),signature)?nonce:null;
}
function validateStatement(statement,params){
 if(typeof statement!=="string"||encoder.encode(statement).length>MAX_SQL_BYTES)throw new Error("INVALID_SQL");
 const query=statement.trim();if(!query)throw new Error("EMPTY_SQL");
 const normalized=query.replace(/;\s*$/,"");if(normalized.includes(";"))throw new Error("MULTIPLE_STATEMENTS_NOT_ALLOWED");
 const uncommented=normalized.replace(/^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)+/,"");
 const first=uncommented.match(/^([a-z]+)/i)?.[1]?.toUpperCase();
 if(!["SELECT","INSERT","UPDATE","DELETE","WITH","VALUES"].includes(first))throw new Error("SQL_OPERATION_NOT_ALLOWED");
 if(!Array.isArray(params)||params.length>100)throw new Error("INVALID_PARAMETERS");
 return {query:normalized,params};
}
function getClient(){
 const url=Deno.env.get("SUPABASE_DB_URL")||"";if(!url)throw new Error("SUPABASE_DB_URL_NOT_CONFIGURED");
 if(!client)client=postgres(url,{max:1,idle_timeout:20,connect_timeout:10,prepare:false,ssl:"require"});
 return client;
}
async function runStatement(connection,operation){
 const checked=validateStatement(operation?.sql,operation?.params??[]);
 const result=await connection.unsafe(checked.query,checked.params);
 return {rows:[...result],rowCount:Number(result.count??result.length??0)};
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
 const declaredLength=Number(req.headers.get("content-length")||0);if(declaredLength>MAX_BODY_BYTES)return json({ok:false,error:"REQUEST_TOO_LARGE"},413);
 const secret=Deno.env.get("RADAR_DB_BRIDGE_SECRET")||"";
 if(secret.length<32)return json({ok:false,error:"BRIDGE_SECRET_NOT_CONFIGURED"},503);
 if(!Deno.env.get("SUPABASE_DB_URL"))return json({ok:false,error:"DATABASE_URL_NOT_CONFIGURED"},503);
 const rawBody=await req.text();if(encoder.encode(rawBody).length>MAX_BODY_BYTES)return json({ok:false,error:"REQUEST_TOO_LARGE"},413);
 const nonce=await verifySignature(rawBody,req,secret);if(!nonce)return json({ok:false,error:"INVALID_SIGNATURE_OR_EXPIRED_REQUEST"},401);
 let payload;try{payload=JSON.parse(rawBody);}catch{return json({ok:false,error:"INVALID_JSON"},400);}
 const operation=payload?.operation;
 const operations=operation==="query"?[{sql:payload.sql,params:payload.params??[]}]:operation==="transaction"&&Array.isArray(payload.operations)?payload.operations:null;
 if(!operations||operations.length<1||operations.length>MAX_OPERATIONS)return json({ok:false,error:"INVALID_OPERATION_BATCH"},400);
 const requestId=crypto.randomUUID(),started=performance.now();
 try{
  const db=getClient();
  await db.unsafe("DELETE FROM private.radar_db_bridge_nonces WHERE expires_at < now()");
  const claimed=await db.unsafe("INSERT INTO private.radar_db_bridge_nonces(nonce,expires_at) VALUES($1,now()+interval '2 minutes') ON CONFLICT DO NOTHING RETURNING nonce",[nonce]);
  if(!claimed.length)return json({ok:false,error:"REPLAY_DETECTED",requestId},409);
  let result;
  if(operation==="query")result=await runStatement(db,operations[0]);
  else{
   const transactionResults=await db.begin(async tx=>{const results=[];for(const item of operations)results.push(await runStatement(tx,item));return results;});
   result={results:transactionResults};
  }
  try{await db.unsafe("INSERT INTO private.radar_db_bridge_audit(request_id,operation,statement_count,duration_ms,status) VALUES($1,$2,$3,$4,'OK')",[requestId,operation,operations.length,Math.round(performance.now()-started)]);}catch{}
  return json({ok:true,requestId,...result});
 }catch(error){
  const code=String(error?.message||error?.code||"DATABASE_ERROR").slice(0,80);console.error("radar-db-bridge",requestId,code);
  try{const db=getClient();await db.unsafe("INSERT INTO private.radar_db_bridge_audit(request_id,operation,statement_count,duration_ms,status) VALUES($1,$2,$3,$4,'ERROR')",[requestId,operation,operations.length,Math.round(performance.now()-started)]);}catch{}
  const clientError=["INVALID_SQL","EMPTY_SQL","MULTIPLE_STATEMENTS_NOT_ALLOWED","SQL_OPERATION_NOT_ALLOWED","INVALID_PARAMETERS"].includes(code);
  return json({ok:false,requestId,error:clientError?code:"DATABASE_QUERY_FAILED"},clientError?400:503);
 }
});
