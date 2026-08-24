import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidConfig, isValidToken } from '../lib/config.js';

const endpoint = 'https://script.google.com/macros/s/example/exec';

test('private connection requires a deployed endpoint and a long token', () => {
  assert.equal(isValidToken('0123456789abcdef0123456789abcdef'), true);
  assert.equal(isValidToken('short'), false);
  assert.equal(isValidConfig({ endpoint, token: '0123456789abcdef0123456789abcdef' }), true);
  assert.equal(isValidConfig({ endpoint: 'https://example.com/exec', token: '0123456789abcdef0123456789abcdef' }), false);
});
