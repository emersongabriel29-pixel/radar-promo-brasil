import { db } from 'hatchable';
import { getOrCreateAccount } from 'lib/accounts.js';
export const access='member';
export const methods=['GET','PUT'];
const modes=['MANUAL','API','AI'];
const types=['AFFILIATE_REDIRECT','OFFICIAL_SHORT','DIRECT_AFFILIATE','COUPON','PRODUCT'];
const messageTypes=['PROMOTION','FLASH','COUPON','IMPORTED','SOCIAL'];
export default async function(req,res){
  if(!req.member?.id)return res.status(401).json({error:'Entre para configurar o criador de ofertas.'});
  try{
    const account=await getOrCreateAccount(req.member);
    if(req.method==='GET'){
      const row=(await db.query('SELECT message_template_id AS "messageTemplateId",message_type AS "messageType",link_mode AS "linkMode",link_type AS "linkType",ai_assist AS "aiAssist",updated_at AS "updatedAt" FROM offer_builder_settings WHERE account_id=$1',[account.id])).rows[0]||{};
      const templates=(await db.query('SELECT id,name FROM message_templates WHERE account_id=$1 AND is_active=true ORDER BY name',[account.id])).rows;
      return res.json({settings:{messageTemplateId:row.messageTemplateId||'',messageType:row.messageType||'PROMOTION',linkMode:row.linkMode||'MANUAL',linkType:row.linkType||'AFFILIATE_REDIRECT',aiAssist:Boolean(row.aiAssist),updatedAt:row.updatedAt||null},templates,capabilities:{manual:true,api:true,ai:true,aiCreatesAffiliateLinks:false}});
    }
    const b=req.body||{},mode=String(b.linkMode||'MANUAL').toUpperCase(),type=String(b.linkType||'AFFILIATE_REDIRECT').toUpperCase(),messageType=String(b.messageType||'PROMOTION').toUpperCase(),templateId=String(b.messageTemplateId||'').trim();
    if(!modes.includes(mode)||!types.includes(type)||!messageTypes.includes(messageType))return res.status(400).json({error:'Seleção de modo, tipo de link ou tipo de oferta inválida.'});
    if(templateId){const found=(await db.query('SELECT id FROM message_templates WHERE id=$1 AND account_id=$2 AND is_active=true',[templateId,account.id])).rows[0];if(!found)return res.status(400).json({error:'O modelo escolhido não existe, está pausado ou pertence a outra conta.'});}
    if(mode==='AI'&&type!=='PRODUCT'&&!b.aiAssist)return res.status(400).json({error:'Ative a assistência de IA para usar esse modo.'});
    await db.query('INSERT INTO offer_builder_settings(account_id,message_template_id,message_type,link_mode,link_type,ai_assist,updated_at) VALUES($1,$2,$3,$4,$5,$6,now()) ON CONFLICT(account_id) DO UPDATE SET message_template_id=EXCLUDED.message_template_id,message_type=EXCLUDED.message_type,link_mode=EXCLUDED.link_mode,link_type=EXCLUDED.link_type,ai_assist=EXCLUDED.ai_assist,updated_at=now()',[account.id,templateId||null,messageType,mode,type,b.aiAssist===true]);
    return res.json({ok:true,settings:{messageTemplateId:templateId,messageType,linkMode:mode,linkType:type,aiAssist:b.aiAssist===true}});
  }catch(error){console.error('offer-builder-settings',error);return res.status(500).json({error:'Não foi possível salvar as preferências do criador de ofertas.'});}
}