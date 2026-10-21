import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_body_policy_gate.mjs";

describe("local body policy gate allow cases", () => {
  it("allows 200 with bytes", () => {
    assert.deepEqual(runFeature({ status: 200, body: "bytes" }), { decision: "allow", reason: "ok-body", policy: { status: 200, body: "bytes" } });
  });
  it("allows 200 with bytes independent of key order", () => {
    assert.deepEqual(runFeature({ body: "bytes", status: 200 }), { decision: "allow", reason: "ok-body", policy: { status: 200, body: "bytes" } });
  });
  it("allows 404 with empty", () => {
    assert.deepEqual(runFeature({ status: 404, body: "empty" }), { decision: "allow", reason: "ok-body", policy: { status: 404, body: "empty" } });
  });
  it("allows 405 with empty", () => {
    assert.deepEqual(runFeature({ status: 405, body: "empty" }), { decision: "allow", reason: "ok-body", policy: { status: 405, body: "empty" } });
  });
});

describe("local body policy gate deny cases", () => {
  it("denies null and non-object payloads with bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature(200), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", policy: null });
  });
  it("denies arrays with bad-payload", () => {
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature([{ status: 200, body: "bytes" }]), { decision: "deny", reason: "bad-payload", policy: null });
  });
  it("denies unknown fields", () => {
    assert.deepEqual(runFeature({ status: 200, body: "bytes", extra: 1 }), { decision: "deny", reason: "unknown-field", policy: null });
    assert.deepEqual(runFeature({ path: "a" }), { decision: "deny", reason: "unknown-field", policy: null });
  });
  it("denies bad string values", () => {
    assert.deepEqual(runFeature({ status: 200, body: "a://b" }), { decision: "deny", reason: "bad-value", policy: null });
    assert.deepEqual(runFeature({ status: 200, body: "a\\\\b" }), { decision: "deny", reason: "bad-value", policy: null });
    assert.deepEqual(runFeature({ status: 200, body: "a..b" }), { decision: "deny", reason: "bad-value", policy: null });
  });
  it("denies missing or non-numeric status with bad-status", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ body: "empty" }), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ status: "200", body: "bytes" }), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ status: 200.5, body: "bytes" }), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ status: Number.NaN, body: "bytes" }), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ status: Number.POSITIVE_INFINITY, body: "bytes" }), { decision: "deny", reason: "bad-status", policy: null });
    assert.deepEqual(runFeature({ status: 9007199254740993, body: "bytes" }), { decision: "deny", reason: "bad-status", policy: null });
  });
  it("denies in-range integers outside allowlist with unknown-status", () => {
    assert.deepEqual(runFeature({ status: 201, body: "bytes" }), { decision: "deny", reason: "unknown-status", policy: null });
    assert.deepEqual(runFeature({ status: 500, body: "empty" }), { decision: "deny", reason: "unknown-status", policy: null });
    assert.deepEqual(runFeature({ status: 0, body: "empty" }), { decision: "deny", reason: "unknown-status", policy: null });
  });
  it("denies missing or non-string body with bad-body", () => {
    assert.deepEqual(runFeature({ status: 200 }), { decision: "deny", reason: "bad-body", policy: null });
    assert.deepEqual(runFeature({ status: 200, body: 200 }), { decision: "deny", reason: "bad-body", policy: null });
    assert.deepEqual(runFeature({ status: 200, body: null }), { decision: "deny", reason: "bad-body", policy: null });
  });
  it("denies other strings with unknown-body", () => {
    assert.deepEqual(runFeature({ status: 200, body: "full" }), { decision: "deny", reason: "unknown-body", policy: null });
    assert.deepEqual(runFeature({ status: 404, body: "missing" }), { decision: "deny", reason: "unknown-body", policy: null });
  });
  it("denies mismatched pairings", () => {
    assert.deepEqual(runFeature({ status: 200, body: "empty" }), { decision: "deny", reason: "mismatch-body", policy: null });
    assert.deepEqual(runFeature({ status: 404, body: "bytes" }), { decision: "deny", reason: "mismatch-body", policy: null });
    assert.deepEqual(runFeature({ status: 405, body: "bytes" }), { decision: "deny", reason: "mismatch-body", policy: null });
  });
});

describe("local body policy gate purity", () => {
  it("preserves input and is deterministic", () => {
    const first = { status: 200, body: "bytes" };
    const snapshot = JSON.stringify(first);
    const outOne = runFeature(first);
    const outTwo = runFeature(first);
    assert.deepEqual(outOne, outTwo);
    assert.equal(JSON.stringify(first), snapshot);
    assert.deepEqual(first, { status: 200, body: "bytes" });
  });
  it("uses for-of, Object.entries and Map get/set without banned access", () => {
    const src = runFeature.toString();
    assert.match(src, /for\s*\(/);
    assert.match(src, /of\s+Object\.entries/);
    assert.match(src, /new\s+Map/);
    assert.match(src, /\.get\(/);
    assert.match(src, /\.set\(/);
    assert.doesNotMatch(src, /Date/);
    assert.doesNotMatch(src, /prototype/);
    assert.doesNotMatch(src, /constructor/);
  });
});
