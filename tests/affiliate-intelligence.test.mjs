import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreAffiliateOpportunity } from '../lib/affiliate-intelligence.js';
test('no clicks means no invented conversion',()=>{const x=scoreAffiliateOpportunity({radarScore:80});assert.equal(x.conversionRate,null);assert.equal(x.evidenceLevel,'QUALITY_ONLY');});
test('clicks and conversions are separate evidence levels',()=>{const a=scoreAffiliateOpportunity({radarScore:70,clicks30d:20});const b=scoreAffiliateOpportunity({radarScore:70,clicks30d:20,orders30d:2,commissionCents30d:1250});assert.equal(a.evidenceLevel,'OBSERVED_CLICKS');assert.equal(b.evidenceLevel,'OBSERVED_CONVERSIONS');assert.equal(b.conversionRate,10);assert.ok(b.score>a.score);});
test('negative metrics are ignored and radar score is clamped',()=>{const x=scoreAffiliateOpportunity({radarScore:900,clicks30d:-1,orders30d:-2,commissionCents30d:-3});assert.equal(x.score,60);assert.equal(x.signals.radarScore,100);assert.equal(x.signals.clicks30d,0);});
