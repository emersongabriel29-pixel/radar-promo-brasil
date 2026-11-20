import {respond} from 'lib/api.js';
import {votes} from 'lib/community.js';
export const access='user';
export const methods=["GET","POST","DELETE"];
export default async function(req,res){return respond(req,res,votes,{verifyOffer:true});}
