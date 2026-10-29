import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/lstat_realpath_check_gate.mjs";

describe("lstat realpath check gate", () => {
  it("accepts lstat plus realpath in per-request mode", () => {
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "per-request" }), {
      decision: "allow",
      reason: "ok-check-method",
      check: { stat: "lstat", resolve: "realpath", mode: "per-request" }
    });
  });

  it("accepts valid triple independent of key order", () => {
    assert.deepEqual(runFeature({ mode: "per-request", resolve: "realpath", stat: "lstat" }), {
      decision: "allow",
      reason: "ok-check-method",
      check: { stat: "lstat", resolve: "realpath", mode: "per-request" }
    });
  });

  it("denies null, array and non-object payloads as bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature([{ stat: "lstat" }]), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature("lstat"), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", check: null });
    assert.deepEqual(runFeature(true), { decision: "deny", reason: "bad-payload", check: null });
  });

  it("denies extra keys as unknown-field", () => {
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "per-request", extra: "x" }), { decision: "deny", reason: "unknown-field", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "per-request", sandbox: "yes" }), { decision: "deny", reason: "unknown-field", check: null });
  });

  it("denies string values containing ://, backslash or dotdot as bad-value", () => {
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "https://example" }), { decision: "deny", reason: "bad-value", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "a\\b", mode: "per-request" }), { decision: "deny", reason: "bad-value", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "a..b" }), { decision: "deny", reason: "bad-value", check: null });
  });

  it("denies missing or non-string stat, resolve or mode", () => {
    assert.deepEqual(runFeature({ resolve: "realpath", mode: "per-request" }), { decision: "deny", reason: "bad-stat", check: null });
    assert.deepEqual(runFeature({ stat: 1, resolve: "realpath", mode: "per-request" }), { decision: "deny", reason: "bad-stat", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", mode: "per-request" }), { decision: "deny", reason: "bad-resolve", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: null, mode: "per-request" }), { decision: "deny", reason: "bad-resolve", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath" }), { decision: "deny", reason: "bad-mode", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: 7 }), { decision: "deny", reason: "bad-mode", check: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-stat", check: null });
  });

  it("denies stat, follow or batched variants as unknown checks", () => {
    assert.deepEqual(runFeature({ stat: "stat", resolve: "realpath", mode: "per-request" }), { decision: "deny", reason: "unknown-stat", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "follow", mode: "per-request" }), { decision: "deny", reason: "unknown-resolve", check: null });
    assert.deepEqual(runFeature({ stat: "lstat", resolve: "realpath", mode: "batched" }), { decision: "deny", reason: "unknown-mode", check: null });
  });

  it("preserves input without mutation and stays deterministic", () => {
    const payload = { stat: "lstat", resolve: "realpath", mode: "per-request" };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(payload), before);
    assert.notEqual(first.check, payload);
    assert.deepEqual(runFeature(Object.freeze({ stat: "lstat", resolve: "realpath", mode: "per-request" })), {
      decision: "allow",
      reason: "ok-check-method",
      check: { stat: "lstat", resolve: "realpath", mode: "per-request" }
    });
  });

  it("uses pure deterministic selection without clock or filesystem", () => {
    const text = runFeature.toString();
    assert.ok(text.includes("for"));
    assert.ok(text.includes("Object.entries"));
    assert.ok(text.includes("Map"));
    assert.ok(text.includes(".get("));
    assert.ok(text.includes(".set("));
    assert.ok(!text.includes("Date"));
  });
});
