import { ai,api,browser,db,scheduler,storage } from 'hatchable';
import { clean,isRateLimit,isSetupRequired,mediaRatio } from 'lib/media.js';

export const access='member';
export const methods=['POST'];
const uid=()=>crypto.randomUUID();
const site='https://radar-promo-brasil.hatchable.site';

async function saveAsset(accountId,channel,model,url){
  return (await db.query("INSERT INTO content_assets(id,account_id,kind,channel,provider_model,asset_url,status) VALUES($1,$2,'IMAGE',$3,$4,$5,'DRAFT') RETURNING id",[uid(),accountId,channel,model,url])).rows[0].id;
}

async function brandedFallback({accountId,title,prompt,style,ratio,channel,error}){
  const id=uid(),token=uid(),sizes={'1:1':[1200,1200],'3:4':[1200,1600],'4:3':[1600,1200],'9:16':[1080,1920],'16:9':[1920,1080],'21:9':[2100,900]},size=sizes[ratio]||sizes['1:1'];
  await db.query("INSERT INTO media_generation_jobs(id,account_id,kind,title,prompt,style,ratio,provider,status,last_error,render_token) VALUES($1,$2,'IMAGE',$3,$4,$5,$6,'BRANDED_CARD','PENDING',$7,$8)",[id,accountId,title,prompt,style,ratio,clean(error,500),token]);
  try{
    const png=await browser.screenshot(site+'/api/ai/card/'+id+'?token='+encodeURIComponent(token),{width:size[0],height:size[1],fullPage:false});
    const key='media/'+accountId+'/'+id+'.png';await storage.put(key,png,'image/png');
    const url='/api/ai/media/file/'+id;
    await db.query("UPDATE media_generation_jobs SET status='FALLBACK_COMPLETED',storage_key=$1,output_url=$2,render_token='',updated_at=now() WHERE id=$3",[key,url,id]);
    const assetId=await saveAsset(accountId,channel,'branded-card-fallback',url);
    return {ok:true,id:assetId,jobId:id,url,mimeType:'image/png',ratio,model:'branded-card-fallback',fallback:true,notice:'O provedor generativo estava ocupado; o sistema criou automaticamente uma arte promocional segura para não interromper seu trabalho.'};
  }catch(renderError){
    await db.query("UPDATE media_generation_jobs SET status='FAILED',last_error=$1,render_token='',updated_at=now() WHERE id=$2",[clean(renderError?.message,500),id]);
    throw renderError;
  }
}

async function startRunway({accountId,title,prompt,style,ratio,reason}){
  const runwayRatio=ratio==='9:16'?'1080:1920':ratio==='16:9'||ratio==='21:9'?'1920:1080':'1024:1024';
  const response=await api.runway.post('/v1/text_to_image',{body:{model:'gen4_image',ratio:runwayRatio,promptText:prompt}});
  if(response.status<200||response.status>=300||!response.body?.id)throw Object.assign(new Error('Runway recusou a geração: '+response.status),{status:response.status});
  const id=uid();
  await db.query("INSERT INTO media_generation_jobs(id,account_id,kind,title,prompt,style,ratio,provider,external_task_id,status,last_error) VALUES($1,$2,'IMAGE',$3,$4,$5,$6,'RUNWAY',$7,'PROCESSING',$8)",[id,accountId,title,prompt,style,ratio,String(response.body.id),clean(reason,500)]);
  await scheduler.at(new Date(Date.now()+30000).toISOString(),'/api/jobs/media',{payload:{jobId:id},name:'media-'+id});
  return {ok:true,jobId:id,status:'PROCESSING',provider:'RUNWAY',ratio,notice:'A arte entrou na fila do provedor alternativo. O painel atualizará o resultado automaticamente.'};
}

export default async function(req,res){
  const b=req.body||{},title=clean(b.title,220),style=clean(b.style,180)||'publicidade moderna brasileira',requestedAspect=clean(b.aspect,10)||'1:1',ratio=mediaRatio(requestedAspect,'IMAGE'),channel=clean(b.channel,30)||'INSTAGRAM';
  if(!title)return res.status(400).json({error:'Informe o produto ou tema da arte.'});
  const account=(await db.query('SELECT id FROM accounts WHERE owner_member_id=$1',[String(req.member.id)])).rows[0];
  if(!account)return res.status(412).json({error:'Abra o painel uma vez para criar sua conta.'});
  const prompt='Crie uma arte publicitária premium para redes sociais sobre: '+title+'. Estilo: '+style+'. Fundo limpo, composição profissional, alto contraste, espaço seguro para texto. Não inclua marcas registradas, logotipos, preço, porcentagem, cupom, selo, letras ou palavras. Não invente aparência exata de um produto específico.';
  try{
    const result=await ai.generateImage({prompt,aspect:ratio,signal:AbortSignal.timeout(60000)}),image=result.images?.[0];
    if(!image?.data)throw new Error('A IA não retornou a imagem.');
    const mime=image.mimeType||'image/png',ext=mime.includes('jpeg')?'jpg':mime.includes('webp')?'webp':'png',jobId=uid(),key='media/'+account.id+'/'+jobId+'.'+ext;
    await storage.put(key,image.data,mime);const url='/api/ai/media/file/'+jobId,model=clean(result.model,80)||'image-ai';
    await db.query("INSERT INTO media_generation_jobs(id,account_id,kind,title,prompt,style,ratio,provider,status,storage_key,output_url) VALUES($1,$2,'IMAGE',$3,$4,$5,$6,$7,'COMPLETED',$8,$9)",[jobId,account.id,title,prompt,style,ratio,model,key,url]);
    const assetId=await saveAsset(account.id,channel,model,url);
    return res.json({ok:true,id:assetId,jobId,url,mimeType:mime,aspect:ratio,requestedAspect,model});
  }catch(primaryError){
    console.error('ai/image primary',primaryError);
    if(isRateLimit(primaryError)||isSetupRequired(primaryError)){
      try{return res.status(202).json(await startRunway({accountId:account.id,title,prompt,style,ratio,reason:primaryError?.message}))}
      catch(runwayError){
        console.error('ai/image runway',runwayError);
        try{return res.json(await brandedFallback({accountId:account.id,title,prompt,style,ratio,channel,error:(primaryError?.message||'')+' | '+(runwayError?.message||'')}))}
        catch(fallbackError){console.error('ai/image fallback',fallbackError)}
      }
    }
    return res.status(502).json({error:'Não foi possível gerar a arte agora. Tente novamente.'});
  }
}
