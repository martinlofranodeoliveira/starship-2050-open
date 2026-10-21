import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/browser_save_gate.mjs";

test("accepts browser-local gameplay", () => {
  const out = runFeature({ store: "browser-local", record: "gameplay" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-local", saved: { store: "browser-local", record: "gameplay" } });
});

test("accepts browser-local score", () => {
  const out = runFeature({ store: "browser-local", record: "score" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-local", saved: { store: "browser-local", record: "score" } });
});

test("accepts reversed key order", () => {
  const out = runFeature({ record: "gameplay", store: "browser-local" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-local", saved: { store: "browser-local", record: "gameplay" } });
});

test("denies cloud store", () => {
  const out = runFeature({ store: "cloud", record: "score" });
  assert.deepEqual(out, { decision: "deny", reason: "unknown-store", saved: null });
});

test("denies leaderboard record", () => {
  const out = runFeature({ store: "browser-local", record: "leaderboard" });
  assert.deepEqual(out, { decision: "deny", reason: "unknown-record", saved: null });
});

test("denies missing and mistyped store and record", () => {
  assert.deepEqual(runFeature({ record: "gameplay" }), { decision: "deny", reason: "bad-store", saved: null });
  assert.deepEqual(runFeature({ store: "browser-local" }), { decision: "deny", reason: "bad-record", saved: null });
  assert.deepEqual(runFeature({ store: 7, record: "gameplay" }), { decision: "deny", reason: "bad-store", saved: null });
  assert.deepEqual(runFeature({ store: "browser-local", record: 7 }), { decision: "deny", reason: "bad-record", saved: null });
  assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-store", saved: null });
});

test("denies unknown fields", () => {
  assert.deepEqual(runFeature({ store: "browser-local", record: "gameplay", extra: "x" }), { decision: "deny", reason: "unknown-field", saved: null });
  assert.deepEqual(runFeature({ cloud: "browser-local" }), { decision: "deny", reason: "unknown-field", saved: null });
});

test("denies non-object payloads", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", saved: null });
  assert.deepEqual(runFeature(["browser-local"]), { decision: "deny", reason: "bad-payload", saved: null });
  assert.deepEqual(runFeature("browser-local"), { decision: "deny", reason: "bad-payload", saved: null });
  assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", saved: null });
  assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", saved: null });
});

test("denies colon-slash-slash backslash dotdot values", () => {
  assert.deepEqual(runFeature({ store: "http://x", record: "gameplay" }), { decision: "deny", reason: "bad-value", saved: null });
  assert.deepEqual(runFeature({ store: "browser-local", record: "a..b" }), { decision: "deny", reason: "bad-value", saved: null });
  assert.deepEqual(runFeature({ store: "a\\b", record: "gameplay" }), { decision: "deny", reason: "bad-value", saved: null });
});

test("preserves input and stays deterministic", () => {
  const a = { store: "browser-local", record: "gameplay" };
  const before = JSON.stringify(a);
  const first = runFeature(a);
  const second = runFeature({ store: "browser-local", record: "gameplay" });
  assert.equal(JSON.stringify(a), before);
  assert.deepEqual(first, second);
  assert.deepEqual(first, { decision: "allow", reason: "ok-local", saved: { store: "browser-local", record: "gameplay" } });
  const d = runFeature({ store: "cloud", record: "score" });
  assert.deepEqual(runFeature({ store: "cloud", record: "score" }), d);
});
