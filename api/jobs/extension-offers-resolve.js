import { resolveExtensionOffer } from 'lib/extension-offer-resolver.js';

export const access = 'scheduler';
export const methods = ['POST'];

export default async function handler(req, res) {
  const result = await resolveExtensionOffer(
    req.body?.offerId || req.query?.offerId,
    req.body?.accountId || req.query?.accountId
  );
  return res.status(result.httpStatus || 200).json(result.body);
}