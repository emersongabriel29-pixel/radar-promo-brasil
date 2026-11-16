import {respond} from 'lib/api.js';
import {comments} from 'lib/community.js';
export const access='user';
export const methods=["POST","PUT","DELETE"];
export default async function(req,res){return respond(req,res,comments,{verifyOffer:true});}
