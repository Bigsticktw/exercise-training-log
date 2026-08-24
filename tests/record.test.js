import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord, isValidEndpoint, taipeiDate, validateEntry } from '../lib/record.js';

test('Taipei date crosses midnight ahead of UTC', () => {
  assert.equal(taipeiDate(new Date('2026-08-23T16:30:00.000Z')), '2026-08-24');
});

test('strength and cardio require an integer duration', () => {
  assert.equal(validateEntry('strength', '30').durationMinutes, 30);
  assert.equal(validateEntry('cardio', '0').valid, false);
  assert.equal(validateEntry('cardio', '1.5').valid, false);
  assert.equal(validateEntry('strength', '1441').valid, false);
});

test('rest always produces a null duration', () => {
  assert.deepEqual(validateEntry('rest', ''), { valid: true, durationMinutes: null });
});

test('record has deterministic daily id and schema', () => {
  const record = buildRecord({
    activityType: 'cardio',
    durationInput: '45',
    now: new Date('2026-08-23T16:30:00.000Z'),
  });
  assert.deepEqual(record, {
    schema_version: 1,
    record_id: 'exercise-2026-08-24',
    record_date: '2026-08-24',
    activity_type: 'cardio',
    duration_minutes: 45,
    timezone: 'Asia/Taipei',
    client_recorded_at: '2026-08-23T16:30:00.000Z',
  });
});

test('endpoint only accepts deployed Google Apps Script URLs', () => {
  assert.equal(isValidEndpoint('https://script.google.com/macros/s/example/exec'), true);
  assert.equal(isValidEndpoint('http://script.google.com/macros/s/example/exec'), false);
  assert.equal(isValidEndpoint('https://example.com/exec'), false);
  assert.equal(isValidEndpoint('https://script.google.com/macros/s/example/dev'), false);
});
