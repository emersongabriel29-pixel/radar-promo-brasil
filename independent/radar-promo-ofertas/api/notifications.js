import {respond} from 'lib/api.js';
import {notifications} from 'lib/community.js';
export const access='user';
export const methods=["GET","PUT","POST"];
export default async function(req,res){return respond(req,res,notifications,{verifyOffer:false});}
