import test from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_phase_gate.mjs";

test("allows check with syntax", () => {
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "syntax" }), {
    decision: "allow",
    reason: "ok-check",
    plan: { phase: "check", scope: "syntax" }
  });
});

test("allows check with serve and test with syntax and serve", () => {
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "serve" }), {
    decision: "allow",
    reason: "ok-check",
    plan: { phase: "check", scope: "serve" }
  });
  assert.deepStrictEqual(runFeature({ phase: "test", scope: "syntax" }), {
    decision: "allow",
    reason: "ok-check",
    plan: { phase: "test", scope: "syntax" }
  });
  assert.deepStrictEqual(runFeature({ phase: "test", scope: "serve" }), {
    decision: "allow",
    reason: "ok-check",
    plan: { phase: "test", scope: "serve" }
  });
});

test("allows start with smoke", () => {
  assert.deepStrictEqual(runFeature({ phase: "start", scope: "smoke" }), {
    decision: "allow",
    reason: "ok-check",
    plan: { phase: "start", scope: "smoke" }
  });
});

test("denies missing or non-string phase and scope", () => {
  assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-phase", plan: null });
  assert.deepStrictEqual(runFeature({ scope: "syntax" }), { decision: "deny", reason: "bad-phase", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check" }), { decision: "deny", reason: "bad-scope", plan: null });
  assert.deepStrictEqual(runFeature({ phase: 1, scope: "syntax" }), { decision: "deny", reason: "bad-phase", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: 2 }), { decision: "deny", reason: "bad-scope", plan: null });
  assert.deepStrictEqual(runFeature({ phase: null, scope: "syntax" }), { decision: "deny", reason: "bad-phase", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: null }), { decision: "deny", reason: "bad-scope", plan: null });
});

test("denies unknown phase and scope strings", () => {
  assert.deepStrictEqual(runFeature({ phase: "deploy", scope: "syntax" }), { decision: "deny", reason: "unknown-phase", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "cloud" }), { decision: "deny", reason: "unknown-scope", plan: null });
});

test("denies mismatched pairings", () => {
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "smoke" }), { decision: "deny", reason: "mismatch-scope", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "test", scope: "smoke" }), { decision: "deny", reason: "mismatch-scope", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "start", scope: "syntax" }), { decision: "deny", reason: "mismatch-scope", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "start", scope: "serve" }), { decision: "deny", reason: "mismatch-scope", plan: null });
});

test("denies non-object or array payload", () => {
  assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", plan: null });
  assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", plan: null });
  assert.deepStrictEqual(runFeature("check"), { decision: "deny", reason: "bad-payload", plan: null });
  assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", plan: null });
  assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", plan: null });
  assert.deepStrictEqual(runFeature([{ phase: "check", scope: "syntax" }]), { decision: "deny", reason: "bad-payload", plan: null });
});

test("denies extra fields", () => {
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "syntax", extra: "no" }), { decision: "deny", reason: "unknown-field", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "syntax", cloud: "yes" }), { decision: "deny", reason: "unknown-field", plan: null });
});

test("denies bad string values", () => {
  assert.deepStrictEqual(runFeature({ phase: "http://x", scope: "syntax" }), { decision: "deny", reason: "bad-value", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "a://b" }), { decision: "deny", reason: "bad-value", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "a\\b", scope: "syntax" }), { decision: "deny", reason: "bad-value", plan: null });
  assert.deepStrictEqual(runFeature({ phase: "check", scope: "a..b" }), { decision: "deny", reason: "bad-value", plan: null });
});

test("preserves input and returns fresh literals deterministically", () => {
  const input = { phase: "check", scope: "syntax" };
  const before = JSON.stringify(input);
  const first = runFeature(input);
  const second = runFeature({ phase: "check", scope: "syntax" });
  assert.strictEqual(JSON.stringify(input), before);
  assert.deepStrictEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.plan, second.plan);
  assert.notStrictEqual(first.plan, input);
  first.plan.phase = "mutated";
  const third = runFeature(input);
  assert.deepStrictEqual(third.plan, { phase: "check", scope: "syntax" });
});

test("uses no clock, env, or network primitives", () => {
  const src = runFeature.toString();
  assert.strictEqual(src.includes("Date"), false);
  assert.strictEqual(src.includes("process"), false);
  assert.strictEqual(src.includes("fetch"), false);
  assert.strictEqual(src.includes("globalThis"), false);
  assert.strictEqual(src.includes("require"), false);
  assert.strictEqual(src.includes("crypto"), false);
  const again = runFeature({ phase: "start", scope: "smoke" });
  assert.deepStrictEqual(again, { decision: "allow", reason: "ok-check", plan: { phase: "start", scope: "smoke" } });
});
