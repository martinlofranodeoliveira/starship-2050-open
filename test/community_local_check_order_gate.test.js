import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_check_order_gate.mjs";

test("accepts check with echoed order", () => {
  const out = runFeature({ steps: ["check"] });
  assert.deepStrictEqual(out, { decision: "allow", reason: "ok-order", order: { steps: ["check"] } });
});

test("accepts check,test with echoed order", () => {
  const out = runFeature({ steps: ["check", "test"] });
  assert.deepStrictEqual(out, { decision: "allow", reason: "ok-order", order: { steps: ["check", "test"] } });
});

test("accepts check,test,start with echoed order", () => {
  const out = runFeature({ steps: ["check", "test", "start"] });
  assert.deepStrictEqual(out, { decision: "allow", reason: "ok-order", order: { steps: ["check", "test", "start"] } });
});

test("denies non-object payloads with bad-payload", () => {
  for (const bad of [null, undefined, 0, 42, "check", true]) {
    assert.deepStrictEqual(runFeature(bad), { decision: "deny", reason: "bad-payload", order: null });
  }
  assert.deepStrictEqual(runFeature(["check"]), { decision: "deny", reason: "bad-payload", order: null });
});

test("denies unknown field", () => {
  assert.deepStrictEqual(runFeature({ steps: ["check"], extra: 1 }), { decision: "deny", reason: "unknown-field", order: null });
  assert.deepStrictEqual(runFeature({ other: [] }), { decision: "deny", reason: "unknown-field", order: null });
});

test("denies missing, non-array, empty or oversized steps", () => {
  assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: "check" }), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: null }), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: [] }), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["check", "test", "start", "check"] }), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["check", 1] }), { decision: "deny", reason: "bad-steps", order: null });
  assert.deepStrictEqual(runFeature({ steps: [null] }), { decision: "deny", reason: "bad-steps", order: null });
});

test("denies values containing colon-slash-slash, backslash or dotdot", () => {
  assert.deepStrictEqual(runFeature({ steps: ["http://x"] }), { decision: "deny", reason: "bad-value", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["check", "a://b"] }), { decision: "deny", reason: "bad-value", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["a\\b"] }), { decision: "deny", reason: "bad-value", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["a..b"] }), { decision: "deny", reason: "bad-value", order: null });
  assert.deepStrictEqual(runFeature({ steps: [".."] }), { decision: "deny", reason: "bad-value", order: null });
});

test("denies unknown steps", () => {
  assert.deepStrictEqual(runFeature({ steps: ["deploy"] }), { decision: "deny", reason: "unknown-step", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["check", "deploy"] }), { decision: "deny", reason: "unknown-step", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["CHECK"] }), { decision: "deny", reason: "unknown-step", order: null });
  assert.deepStrictEqual(runFeature({ steps: [""] }), { decision: "deny", reason: "unknown-step", order: null });
});

test("denies repeated steps with duplicate-step", () => {
  assert.deepStrictEqual(runFeature({ steps: ["check", "check"] }), { decision: "deny", reason: "duplicate-step", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["check", "test", "test"] }), { decision: "deny", reason: "duplicate-step", order: null });
});

test("denies first-not-check and rank decrease with out-of-order", () => {
  assert.deepStrictEqual(runFeature({ steps: ["test"] }), { decision: "deny", reason: "out-of-order", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["start"] }), { decision: "deny", reason: "out-of-order", order: null });
  assert.deepStrictEqual(runFeature({ steps: ["test", "start"] }), { decision: "deny", reason: "out-of-order", order: null });
});

test("denies forward skip with gap-step", () => {
  assert.deepStrictEqual(runFeature({ steps: ["check", "start"] }), { decision: "deny", reason: "gap-step", order: null });
});

test("preserves input and returns fresh order copy", () => {
  const payload = { steps: ["check", "test"] };
  const before = JSON.stringify(payload);
  const out = runFeature(payload);
  assert.deepStrictEqual(out, { decision: "allow", reason: "ok-order", order: { steps: ["check", "test"] } });
  assert.strictEqual(JSON.stringify(payload), before);
  assert.notStrictEqual(out.order.steps, payload.steps);
});

test("is deterministic and returns strict shape without Date use", () => {
  const first = runFeature({ steps: ["check", "test", "start"] });
  const second = runFeature({ steps: ["check", "test", "start"] });
  assert.deepStrictEqual(first, second);
  for (const value of [first, runFeature({ steps: ["check", "start"] })]) {
    const keys = Object.keys(value).sort();
    assert.deepStrictEqual(keys, ["decision", "order", "reason"]);
    assert.ok(value.decision === "allow" || value.decision === "deny");
  }
  assert.strictEqual(runFeature.toString().includes("Date"), false);
});
