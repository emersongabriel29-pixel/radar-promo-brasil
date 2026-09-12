import { db } from 'hatchable';
import { prepareSocialPosts,dispatchSocialPosts } from 'lib/social-autopilot.js';

export const access='scheduler';
export const methods=['POST'];

export default async function(req,res){
  const accounts=(await db.query("SELECT account_id AS \"accountId\" FROM social_autopilot_settings WHERE status='ACTIVE'")).rows;
  let generated=0,published=0,blocked=0,failed=0;
  for(const a of accounts){
    try{
      const made=await prepareSocialPosts(a.accountId,{limit:4});generated+=made.generated||0;
      const sent=await dispatchSocialPosts(a.accountId,10);published+=sent.published||0;blocked+=sent.blocked||0;failed+=sent.failed||0;
    }catch(e){console.error('jobs/social account',a.accountId,e);failed++}
  }
  return res.json({ok:true,accounts:accounts.length,generated,published,blocked,failed});
}
