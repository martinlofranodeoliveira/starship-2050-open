import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/auxiliary_independence_gate.mjs";

test("accepts community standalone as allow ok-independent with standing echo", () => {
  const input = { auxiliary: "community", coupling: "standalone" };
  const before = JSON.stringify(input);
  const result = runFeature(input);
  assert.deepEqual(result, {
    decision: "allow",
    reason: "ok-independent",
    standing: { auxiliary: "community", coupling: "standalone" }
  });
  assert.equal(JSON.stringify(input), before);
});

test("denies coupling integrated as unknown-coupling", () => {
  const result = runFeature({ auxiliary: "community", coupling: "integrated" });
  assert.deepEqual(result, { decision: "deny", reason: "unknown-coupling", standing: null });
});

test("denies coupling ui-main as unknown-coupling", () => {
  const result = runFeature({ auxiliary: "community", coupling: "ui-main" });
  assert.deepEqual(result, { decision: "deny", reason: "unknown-coupling", standing: null });
});

test("denies unknown extra field with unknown-field and preserves input", () => {
  const input = { auxiliary: "community", coupling: "standalone", extra: "x" };
  const before = JSON.stringify(input);
  const result = runFeature(input);
  assert.deepEqual(result, { decision: "deny", reason: "unknown-field", standing: null });
  assert.equal(JSON.stringify(input), before);
});

test("denies null and array payloads with bad-payload", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", standing: null });
  const arr = [{ auxiliary: "community", coupling: "standalone" }];
  const before = JSON.stringify(arr);
  assert.deepEqual(runFeature(arr), { decision: "deny", reason: "bad-payload", standing: null });
  assert.equal(JSON.stringify(arr), before);
});

test("denies bad values containing traversal or scheme markers", () => {
  assert.deepEqual(runFeature({ auxiliary: "community", coupling: "a://b" }), { decision: "deny", reason: "bad-value", standing: null });
  assert.deepEqual(runFeature({ auxiliary: "a\\b", coupling: "standalone" }), { decision: "deny", reason: "bad-value", standing: null });
  assert.deepEqual(runFeature({ auxiliary: "community", coupling: "a..b" }), { decision: "deny", reason: "bad-value", standing: null });
});

test("denies missing or mismatched auxiliary and coupling codes", () => {
  assert.deepEqual(runFeature({ coupling: "standalone" }), { decision: "deny", reason: "bad-auxiliary", standing: null });
  assert.deepEqual(runFeature({ auxiliary: "other", coupling: "standalone" }), { decision: "deny", reason: "unknown-auxiliary", standing: null });
  assert.deepEqual(runFeature({ auxiliary: "community" }), { decision: "deny", reason: "bad-coupling", standing: null });
  assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-auxiliary", standing: null });
});

test("remains deterministic pure JSON without mutation", () => {
  const input = { auxiliary: "community", coupling: "standalone" };
  const first = runFeature(input);
  const second = runFeature({ auxiliary: "community", coupling: "standalone" });
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(JSON.parse(JSON.stringify(first))));
  const denied = { auxiliary: "community", coupling: "integrated" };
  const before = JSON.stringify(denied);
  const out = runFeature(denied);
  assert.deepEqual(out, { decision: "deny", reason: "unknown-coupling", standing: null });
  assert.equal(JSON.stringify(denied), before);
  assert.equal(JSON.stringify(out), JSON.stringify(JSON.parse(JSON.stringify(out))));
});
