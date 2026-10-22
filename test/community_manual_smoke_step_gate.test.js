import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/manual_smoke_step_gate.mjs";

test("allow when actor manual and step open", () => {
  const out = runFeature({ actor: "manual", step: "open" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-manual", smoke: { actor: "manual", step: "open" } });
});

test("allow when actor manual and step start", () => {
  const out = runFeature({ actor: "manual", step: "start" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-manual", smoke: { actor: "manual", step: "start" } });
});

test("deny when actor missing", () => {
  const out = runFeature({ step: "open" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-actor", smoke: null });
});

test("deny when actor non-string", () => {
  const out = runFeature({ actor: 7, step: "open" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-actor", smoke: null });
});

test("deny when actor unknown", () => {
  const out = runFeature({ actor: "auto", step: "open" });
  assert.deepEqual(out, { decision: "deny", reason: "unknown-actor", smoke: null });
});

test("deny when step missing", () => {
  const out = runFeature({ actor: "manual" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-step", smoke: null });
});

test("deny when step non-string", () => {
  const out = runFeature({ actor: "manual", step: 3 });
  assert.deepEqual(out, { decision: "deny", reason: "bad-step", smoke: null });
});

test("deny when step unknown and preserves input", () => {
  const input = { actor: "manual", step: "serve" };
  const before = JSON.stringify(input);
  const out = runFeature(input);
  assert.deepEqual(out, { decision: "deny", reason: "unknown-step", smoke: null });
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(input, { actor: "manual", step: "serve" });
});

test("deny when payload has extra field", () => {
  const out = runFeature({ actor: "manual", step: "open", extra: "x" });
  assert.deepEqual(out, { decision: "deny", reason: "unknown-field", smoke: null });
});

test("deny when bad-value with colon-slash-slash", () => {
  const out = runFeature({ actor: "manual", step: "a://b" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-value", smoke: null });
});

test("deny when bad-value with backslash", () => {
  const out = runFeature({ actor: "manual", step: "a\\b" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-value", smoke: null });
});

test("deny when bad-value with dotdot", () => {
  const out = runFeature({ actor: "manual", step: "a..b" });
  assert.deepEqual(out, { decision: "deny", reason: "bad-value", smoke: null });
});

test("deny bad-payload for null array and primitives", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", smoke: null });
  assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", smoke: null });
  assert.deepEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", smoke: null });
  assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", smoke: null });
});

test("deterministic pure JSON same input same output", () => {
  const a = runFeature({ actor: "manual", step: "open" });
  const b = runFeature({ actor: "manual", step: "open" });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const c = runFeature({ actor: "manual", step: "serve" });
  const d = runFeature({ actor: "manual", step: "serve" });
  assert.deepEqual(c, d);
  assert.equal(JSON.parse(JSON.stringify(a)).decision, "allow");
});
