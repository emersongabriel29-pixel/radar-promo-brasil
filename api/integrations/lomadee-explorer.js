import { db } from 'hatchable';
import { lomadeeGet, listLomadeeRows } from 'lib/lomadee-api.js';

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
  if(req.method==='GET')return res.json({provider:'LOMADEE',baseUrl:'https://api.lomadee.com.br',status:'READY',rateLimit:'60 requests/60 seconds per key and IP',resources:['products','brands','channels','campaigns','orders','shortener'],actions:['audit','catalog','orders','links'],readOnly:true});
  const action=clean(req.body?.action,30);
  if(action!=='audit'&&action!=='catalog'&&action!=='orders'&&action!=='links')return res.status(400).json({error:'Ação inválida.'});
  const resources=action==='audit'?['products','brands','channels','campaigns','orders','shortener']:action==='catalog'?['products','brands','channels','campaigns']:action==='orders'?['orders']:['shortener'];
  const specs={
    products:{path:'/affiliate/products',limit:100,params:{isAvailable:true}},
    brands:{path:'/affiliate/brands',limit:20,params:{}},
    channels:{path:'/affiliate/channels',limit:20,params:{}},
    campaigns:{path:'/affiliate/campaigns',limit:20,params:{}},
    orders:{path:'/affiliate/orders',limit:100,params:{}},
    shortener:{path:'/affiliate/shortener/urls',limit:100,params:{active:true}}
  };
  const report=[];
  for(const resource of resources){
    const spec=specs[resource];let returned=0,total=null,pages=0,remaining=null,failed=null;
    try{
      const maxPages=resource==='products'?3:resource==='orders'?2:2;
      for(let page=1;page<=maxPages;page++){
        const body=await lomadeeGet(account.id,spec.path,{...spec.params,page,limit:spec.limit});
        const rows=listLomadeeRows(body);
        returned+=rows.length;pages++;
        if(total===null)total=countOf(body);
        if(resource==='shortener'&&page===1)remaining=Number(body?.rateLimitRemaining)||null;
        const meta=body?.meta||body?.pagination||{};
        if(page>=Number(meta.totalPages||0)||rows.length===0||(total!==null&&returned>=total))break;
      }
      await db.query("INSERT INTO marketplace_api_audit(account_id,marketplace,operation,status,returned_count,total_available,page_count,rate_limit_remaining,details) VALUES($1,'LOMADEE',$2,'OK',$3,$4,$5,$6,$7::jsonb)",[account.id,resource,returned,total,pages,remaining,JSON.stringify({readOnly:true})]);
      report.push({resource,status:'OK',returnedCount:returned,totalAvailable:total,pagesRead:pages});
    }catch(error){
      const status=Number(error?.status)||0;failed={status,reason:status===403?'SCOPE_NOT_GRANTED':status===429?'RATE_LIMIT':'REQUEST_FAILED'};
      await db.query("INSERT INTO marketplace_api_audit(account_id,marketplace,operation,status,returned_count,page_count,details) VALUES($1,'LOMADEE',$2,$3,0,$4,$5::jsonb)",[account.id,resource,failed.reason,pages,JSON.stringify({httpStatus:status})]);
      report.push({resource,status:'ERROR',httpStatus:status,reason:failed.reason});
    }
  }
  return res.json({provider:'LOMADEE',action,readOnly:true,publicationEnabled:false,checks:report,summary:{checked:report.filter(x=>x.status==='OK').length,failed:report.filter(x=>x.status==='ERROR').length},note:'Auditoria real somente leitura. A paginação é limitada para respeitar 60 requisições por minuto.'});
}