import {respond} from 'lib/api.js';
import {publicComments} from 'lib/community.js';
export const access='public';
export const methods=["GET"];
export default async function(req,res){return respond(req,res,publicComments,{verifyOffer:false});}
