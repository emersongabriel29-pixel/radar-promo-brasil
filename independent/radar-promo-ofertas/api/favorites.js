import {respond} from 'lib/api.js';
import {favorites} from 'lib/community.js';
export const access='user';
export const methods=["GET","POST","DELETE"];
export default async function(req,res){return respond(req,res,favorites,{verifyOffer:true});}
