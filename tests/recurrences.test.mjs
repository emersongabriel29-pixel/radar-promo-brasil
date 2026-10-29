import test from 'node:test';
import assert from 'node:assert/strict';
import { localParts, validDay, nextOccurrence } from '../lib/recurrences.js';

test('validDay aceita datas reais e rejeita datas impossíveis', () => {
  assert.equal(validDay('2026-10-29'), true);
  assert.equal(validDay('2024-02-29'), true);
  assert.equal(validDay('2026-02-29'), false);
  assert.equal(validDay('2026-13-01'), false);
  assert.equal(validDay('29/10/2026'), false);
  assert.equal(validDay(''), false);
});

test('recorrência diária usa horário local de São Paulo e sempre retorna instante futuro', () => {
  const after = new Date('2026-10-29T15:00:00.000Z');
  const next = nextOccurrence({ recurrence: 'DAILY', send_time: '14:00' }, after);
  assert.ok(next instanceof Date);
  assert.ok(next > after);
  assert.deepEqual(localParts(next), { day: '2026-10-29', time: '14:00', second: 0 });
});

test('recorrência WEEKDAYS pula sábado e domingo', () => {
  const after = new Date('2026-10-30T18:00:00.000Z'); // sexta-feira, 15h em São Paulo
  const next = nextOccurrence({ recurrence: 'WEEKDAYS', send_time: '09:00' }, after);
  assert.deepEqual(localParts(next), { day: '2026-11-02', time: '09:00', second: 0 });
});

test('recorrência semanal respeita o dia da semana configurado', () => {
  const after = new Date('2026-10-29T15:00:00.000Z');
  const next = nextOccurrence({ recurrence: 'WEEKLY', weekday: 1, send_time: '10:30' }, after);
  assert.deepEqual(localParts(next), { day: '2026-11-02', time: '10:30', second: 0 });
});

test('recorrência única não dispara no passado e rejeita data inválida', () => {
  const after = new Date('2026-10-29T15:00:00.000Z');
  assert.equal(nextOccurrence({ recurrence: 'ONCE', once_date: '2026-10-28', send_time: '10:00' }, after), null);
  assert.equal(nextOccurrence({ recurrence: 'ONCE', once_date: '2026-02-29', send_time: '10:00' }, after), null);
  const future = nextOccurrence({ recurrence: 'ONCE', once_date: '2026-10-30', send_time: '10:00' }, after);
  assert.deepEqual(localParts(future), { day: '2026-10-30', time: '10:00', second: 0 });
});

test('recorrência rejeita horário e tipo inválidos', () => {
  assert.throws(() => nextOccurrence({ recurrence: 'EVERY_MINUTE', send_time: '10:00' }, new Date()), /Recorrência inválida/);
  assert.throws(() => nextOccurrence({ recurrence: 'DAILY', send_time: '25:90' }, new Date()), /Recorrência inválida/);
});
