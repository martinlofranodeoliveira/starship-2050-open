import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFeature } from '../js/community/synthetic_fixture_gate.mjs';

test('allows symlink-loop with loopback', () => {
  const input = { fixture: 'symlink-loop', network: 'loopback' };
  assert.deepStrictEqual(runFeature(input), {
    decision: 'allow',
    reason: 'ok-synthetic',
    setup: { fixture: 'symlink-loop', network: 'loopback' }
  });
});

test('allows traversal-probe with loopback', () => {
  const input = { fixture: 'traversal-probe', network: 'loopback' };
  assert.deepStrictEqual(runFeature(input), {
    decision: 'allow',
    reason: 'ok-synthetic',
    setup: { fixture: 'traversal-probe', network: 'loopback' }
  });
});

test('allows dotfile-probe with loopback', () => {
  const input = { fixture: 'dotfile-probe', network: 'loopback' };
  assert.deepStrictEqual(runFeature(input), {
    decision: 'allow',
    reason: 'ok-synthetic',
    setup: { fixture: 'dotfile-probe', network: 'loopback' }
  });
});

test('denies unknown fixture and preserves input', () => {
  const input = { fixture: 'other', network: 'loopback' };
  const before = JSON.stringify(input);
  assert.deepStrictEqual(runFeature(input), {
    decision: 'deny',
    reason: 'unknown-fixture',
    setup: null
  });
  assert.strictEqual(JSON.stringify(input), before);
});

test('denies unknown network and preserves input', () => {
  const input = { fixture: 'symlink-loop', network: 'cloud' };
  const before = JSON.stringify(input);
  assert.deepStrictEqual(runFeature(input), {
    decision: 'deny',
    reason: 'unknown-network',
    setup: null
  });
  assert.strictEqual(JSON.stringify(input), before);
});

test('denies non-object payloads with bad-payload', () => {
  for (const payload of [null, undefined, 42, 'x', true, []]) {
    assert.deepStrictEqual(runFeature(payload), {
      decision: 'deny',
      reason: 'bad-payload',
      setup: null
    });
  }
  assert.deepStrictEqual(runFeature({ fixture: 'symlink-loop', network: 'loopback' }), {
    decision: 'allow',
    reason: 'ok-synthetic',
    setup: { fixture: 'symlink-loop', network: 'loopback' }
  });
});

test('denies unknown fields', () => {
  assert.deepStrictEqual(runFeature({ fixture: 'symlink-loop', network: 'loopback', extra: 'x' }), {
    decision: 'deny',
    reason: 'unknown-field',
    setup: null
  });
  assert.deepStrictEqual(runFeature({ unknown: 1 }), {
    decision: 'deny',
    reason: 'unknown-field',
    setup: null
  });
});

test('denies colon-slash-slash backslash and dotdot values', () => {
  assert.deepStrictEqual(runFeature({ fixture: 'symlink-loop', network: 'loopback://x' }), {
    decision: 'deny',
    reason: 'bad-value',
    setup: null
  });
  assert.deepStrictEqual(runFeature({ fixture: 'a\\b', network: 'loopback' }), {
    decision: 'deny',
    reason: 'bad-value',
    setup: null
  });
  assert.deepStrictEqual(runFeature({ fixture: 'a..b', network: 'loopback' }), {
    decision: 'deny',
    reason: 'bad-value',
    setup: null
  });
  assert.deepStrictEqual(runFeature({ fixture: 'https://x', network: 'loopback' }), {
    decision: 'deny',
    reason: 'bad-value',
    setup: null
  });
});

test('denies missing or non-string fixture and network', () => {
  assert.deepStrictEqual(runFeature({}), { decision: 'deny', reason: 'bad-fixture', setup: null });
  assert.deepStrictEqual(runFeature({ network: 'loopback' }), { decision: 'deny', reason: 'bad-fixture', setup: null });
  assert.deepStrictEqual(runFeature({ fixture: 123, network: 'loopback' }), { decision: 'deny', reason: 'bad-fixture', setup: null });
  assert.deepStrictEqual(runFeature({ fixture: 'symlink-loop' }), { decision: 'deny', reason: 'bad-network', setup: null });
  assert.deepStrictEqual(runFeature({ fixture: 'symlink-loop', network: 123 }), { decision: 'deny', reason: 'bad-network', setup: null });
});

test('is deterministic pure JSON and preserves input', () => {
  const input = { fixture: 'traversal-probe', network: 'loopback' };
  const before = JSON.stringify(input);
  const first = runFeature(input);
  const second = runFeature({ fixture: 'traversal-probe', network: 'loopback' });
  assert.deepStrictEqual(first, second);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
  assert.strictEqual(JSON.stringify(input), before);
  assert.strictEqual(typeof first.decision, 'string');
  assert.strictEqual(typeof first.reason, 'string');
});
