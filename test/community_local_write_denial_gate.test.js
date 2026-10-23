import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_write_denial_gate.mjs";

describe("local write denial gate", () => {
  it("allows read with GET", () => {
    assert.deepEqual(runFeature({ operation: "read", method: "GET" }), { decision: "allow", reason: "ok-read", verdict: { operation: "read", method: "GET" } });
  });
  it("allows read with HEAD regardless of key order", () => {
    assert.deepEqual(runFeature({ method: "HEAD", operation: "read" }), { decision: "allow", reason: "ok-read", verdict: { method: "HEAD", operation: "read" } });
  });
  it("matches documented read example", () => {
    assert.deepEqual(runFeature({ method: "GET", operation: "read" }), { decision: "allow", reason: "ok-read", verdict: { method: "GET", operation: "read" } });
  });
  it("denies write with POST", () => {
    assert.deepEqual(runFeature({ operation: "write", method: "POST" }), { decision: "deny", reason: "denied-write", verdict: null });
  });
  it("denies write with PUT DELETE PATCH", () => {
    assert.deepEqual(runFeature({ operation: "write", method: "PUT" }), { decision: "deny", reason: "denied-write", verdict: null });
    assert.deepEqual(runFeature({ operation: "write", method: "DELETE" }), { decision: "deny", reason: "denied-write", verdict: null });
    assert.deepEqual(runFeature({ operation: "write", method: "PATCH" }), { decision: "deny", reason: "denied-write", verdict: null });
  });
  it("denies read with POST as mismatch", () => {
    assert.deepEqual(runFeature({ operation: "read", method: "POST" }), { decision: "deny", reason: "mismatch-operation", verdict: null });
  });
  it("denies write with GET as mismatch", () => {
    assert.deepEqual(runFeature({ operation: "write", method: "GET" }), { decision: "deny", reason: "mismatch-operation", verdict: null });
    assert.deepEqual(runFeature({ operation: "write", method: "HEAD" }), { decision: "deny", reason: "mismatch-operation", verdict: null });
  });
  it("denies bad payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", verdict: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", verdict: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", verdict: null });
    assert.deepEqual(runFeature([{ operation: "read", method: "GET" }]), { decision: "deny", reason: "bad-payload", verdict: null });
    assert.deepEqual(runFeature("read"), { decision: "deny", reason: "bad-payload", verdict: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", verdict: null });
  });
  it("denies unknown field", () => {
    assert.deepEqual(runFeature({ operation: "read", method: "GET", extra: "x" }), { decision: "deny", reason: "unknown-field", verdict: null });
  });
  it("denies bad value substrings", () => {
    assert.deepEqual(runFeature({ operation: "read", method: "https://x" }), { decision: "deny", reason: "bad-value", verdict: null });
    assert.deepEqual(runFeature({ operation: "a\\b", method: "GET" }), { decision: "deny", reason: "bad-value", verdict: null });
    assert.deepEqual(runFeature({ operation: "a..b", method: "GET" }), { decision: "deny", reason: "bad-value", verdict: null });
  });
  it("denies bad operation when missing or non-string", () => {
    assert.deepEqual(runFeature({ method: "GET" }), { decision: "deny", reason: "bad-operation", verdict: null });
    assert.deepEqual(runFeature({ operation: 7, method: "GET" }), { decision: "deny", reason: "bad-operation", verdict: null });
    assert.deepEqual(runFeature({ method: "GET", operation: null }), { decision: "deny", reason: "bad-operation", verdict: null });
  });
  it("denies unknown operation", () => {
    assert.deepEqual(runFeature({ operation: "delete", method: "GET" }), { decision: "deny", reason: "unknown-operation", verdict: null });
    assert.deepEqual(runFeature({ operation: "READ", method: "GET" }), { decision: "deny", reason: "unknown-operation", verdict: null });
  });
  it("denies bad method when missing or non-string", () => {
    assert.deepEqual(runFeature({ operation: "read" }), { decision: "deny", reason: "bad-method", verdict: null });
    assert.deepEqual(runFeature({ operation: "read", method: 7 }), { decision: "deny", reason: "bad-method", verdict: null });
  });
  it("denies unknown method", () => {
    assert.deepEqual(runFeature({ operation: "read", method: "OPTIONS" }), { decision: "deny", reason: "unknown-method", verdict: null });
    assert.deepEqual(runFeature({ operation: "read", method: "get" }), { decision: "deny", reason: "unknown-method", verdict: null });
  });
  it("preserves input and is deterministic", () => {
    const a = { operation: "read", method: "GET" };
    const before = JSON.stringify(a);
    const first = runFeature(a);
    const second = runFeature({ operation: "read", method: "GET" });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(a), before);
    const b = { operation: "write", method: "POST" };
    const beforeB = JSON.stringify(b);
    assert.deepEqual(runFeature(b), { decision: "deny", reason: "denied-write", verdict: null });
    assert.equal(JSON.stringify(b), beforeB);
  });
  it("never uses clock identifier", () => {
    assert.equal(runFeature.toString().includes("Date"), false);
  });
});
