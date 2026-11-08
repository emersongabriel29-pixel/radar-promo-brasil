import test from 'node:test';
import assert from 'node:assert/strict';
import { eligiblePublication, claimStatements } from '../lib/delivery.js';

const reviewGate = "COALESCE(verified_offer.classification_status,'') <> 'REVIEW'";

test('publication eligibility blocks offers awaiting classification review', () => {
  assert.ok(eligiblePublication.includes(reviewGate));
});

test('Telegram and WhatsApp claim statements inherit the classification review gate', () => {
  const telegramSql = claimStatements('publication-id', 'account-id')[1].sql;
  const whatsappSql = claimStatements('publication-id', 'account-id', null, '$5')[1].sql;
  assert.ok(telegramSql.includes(reviewGate));
  assert.ok(whatsappSql.includes(reviewGate));
});
