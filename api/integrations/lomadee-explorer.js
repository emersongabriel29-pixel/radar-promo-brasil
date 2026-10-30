import { db } from 'hatchable';
import { lomadeeGet, listLomadeeRows } from 'lib/lomadee-api.js';
import { persistDiscoveryPage } from 'lib/affiliate-discovery.js';

export const access='member';
export const methods=['GET','POST'];
const clean=(v,n=160)=>String(v??'').trim().slice(0,n);
async function accountFor(member){
  return (await db.query("SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",[String(member.id)])).rows[0];
}
function countOf(body){
  const n=Number(body?.count ?? body?.meta?.total ?? body?.pagination?.total ?? body?.pagination?.totalItems);
  return Number.isFinite(n)&&n>=0?n:null;
}
export default async function handler(req,res){
  if(!req.member)return res.status(401).json({error:'Entre para acessar o explorador Lomadee.'});
  const account=await accountFor(req.member);
  if(!account)return res.status(412).json({error:'Conta Radar não encontrada.'});
  if(req.method==='GET')return res.json({provider:'LOMADEE',baseUrl:'https://api.lomadee.com.br',status:'READY',rateLimit:'60 requests/60 seconds per key and IP',resources:['products','brands','channels','campaigns','orders','shortener'],actions:['audit','catalog','sync_catalog','orders','links'],readOnly:true});
  const action=clean(req.body?.action,30);
  if(action==='sync_catalog'){
    const credential=(await db.query("SELECT status FROM marketplace_api_credentials WHERE account_id=$1 AND marketplace='LOMADEE' LIMIT 1",[account.id])).rows[0];
    if(!credential||credential.status!=='VALIDATED')return res.status(412).json({error:'Valide a credencial Lomadee antes de persistir o catálogo.'});
  }
  if(!['audit','catalog','sync_catalog','orders','links'].includes(action))return res.status(400).json({error:'Ação inválida.'});
  const specs={
    products:{path:'/affiliate/products',limit:100,params:{isAvailable:true},kind:'PRODUCT'},
    brands:{path:'/affiliate/brands',limit:20,params:{},kind:'BRAND'},
    channels:{path:'/affiliate/channels',limit:20,params:{},kind:'CHANNEL'},
    campaigns:{path:'/affiliate/campaigns',limit:20,params:{},kind:'CAMPAIGN'},
    orders:{path:'/affiliate/orders',limit:100,params:{},kind:null},
    shortener:{path:'/affiliate/shortener/urls',limit:100,params:{active:true},kind:'LINK'}
  };
  const resources=action==='audit'?['products','brands','channels','campaigns','orders','shortener']:action==='catalog'||action==='sync_catalog'?['products','brands','channels','campaigns']:action==='orders'?['orders']:['shortener'];
  const report=[];
  for(const resource of resources){
    const spec=specs[resource];let returned=0,persisted=0,total=null,pages=0,remaining=null,nextPage=null;
    const startPage=action==='sync_catalog'?Math.min(1000,Math.max(1,Math.floor(Number(req.body?.startPage)||1))):1;
    const maxPages=action==='sync_catalog'?Math.min(10,Math.max(1,Math.floor(Number(req.body?.maxPages)||10))):(resource==='products'?3:resource==='orders'?2:2);
    try{
      for(let offset=0;offset<maxPages;offset++){
        const page=startPage+offset;
        const body=await lomadeeGet(account.id,spec.path,{...spec.params,page,limit:spec.limit});
        const rows=listLomadeeRows(body);
        returned+=rows.length;pages++;
        if(total===null)total=countOf(body);
        if(resource==='shortener'&&page===startPage)remaining=Number(body?.rateLimitRemaining)||null;
        if(action==='sync_catalog'){
          const meta=body?.meta||body?.pagination||{};
          const totalPages=Number(meta.totalPages||meta.pages||meta.pageCount)||null;
          const hasMore=totalPages? page<totalPages : rows.length>=spec.limit && (total===null||returned<total);
          const persistedPage=await persistDiscoveryPage(db,{accountId:account.id,marketplace:'LOMADEE',operation:resource,kind:spec.kind,items:rows,cursorIn:String(page),cursorOut:hasMore?String(page+1):null,rateLimitRemaining:remaining});
          persisted+=persistedPage.recordsUpserted;
          if(!hasMore){nextPage=null;break;}
          nextPage=page+1;
        }else{
          const meta=body?.meta||body?.pagination||{};
          const totalPages=Number(meta.totalPages||meta.pages||meta.pageCount)||null;
          if((totalPages&&page>=totalPages)||rows.length===0||(total!==null&&returned>=total)||rows.length<spec.limit)break;
        }
      }
      await db.query("INSERT INTO marketplace_api_audit(account_id,marketplace,operation,status,returned_count,total_available,page_count,rate_limit_remaining,details) VALUES($1,'LOMADEE',$2,'OK',$3,$4,$5,$6,$7::jsonb)",[account.id,resource,returned,total,pages,remaining,JSON.stringify({readOnly:true,catalogPersisted:action==='sync_catalog',recordsUpserted:persisted,nextPage})]);
      report.push({resource,status:'OK',returnedCount:returned,totalAvailable:total,pagesRead:pages,recordsPersisted:persisted,nextPage});
    }catch(error){
      const status=Number(error?.status)||0,reason=status===403?'SCOPE_NOT_GRANTED':status===429?'RATE_LIMIT':'REQUEST_FAILED';
      await db.query("INSERT INTO marketplace_api_audit(account_id,marketplace,operation,status,returned_count,page_count,details) VALUES($1,'LOMADEE',$2,$3,$4,$5,$6::jsonb)",[account.id,resource,reason,returned,pages,JSON.stringify({httpStatus:status,readOnly:true})]);
      report.push({resource,status:'ERROR',httpStatus:status,reason,returnedCount:returned,pagesRead:pages,recordsPersisted:persisted});
    }
  }
  return res.json({provider:'LOMADEE',action,readOnly:true,publicationEnabled:false,checks:report,summary:{checked:report.filter(x=>x.status==='OK').length,failed:report.filter(x=>x.status==='ERROR').length,recordsPersisted:report.reduce((sum,x)=>sum+(Number(x.recordsPersisted)||0),0)},note:action==='sync_catalog'?'Catálogo consultado e persistido para exploração; os limites de páginas e cotas foram respeitados. Nenhuma oferta foi criada ou publicada.':'Auditoria somente leitura. A paginação de auditoria continua limitada para respeitar as cotas da API.'});
}
