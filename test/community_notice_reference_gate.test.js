import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/notice_reference_gate.mjs";

describe("notice reference gate", () => {
  it("allows NOTICE.md with private-history", () => {
    assert.deepEqual(runFeature({ notice: "NOTICE.md", topic: "private-history" }), {
      decision: "allow",
      reason: "ok-notice",
      reference: { notice: "NOTICE.md", topic: "private-history" }
    });
  });
  it("denies unknown notice", () => {
    assert.deepEqual(runFeature({ notice: "README.md", topic: "private-history" }), {
      decision: "deny",
      reason: "unknown-notice",
      reference: null
    });
  });
  it("denies unknown topic", () => {
    assert.deepEqual(runFeature({ notice: "NOTICE.md", topic: "gameplay" }), {
      decision: "deny",
      reason: "unknown-topic",
      reference: null
    });
  });
  it("denies bad payload variants", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature([{ notice: "NOTICE.md", topic: "private-history" }]), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature("NOTICE.md"), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", reference: null });
  });
  it("denies unknown fields", () => {
    assert.deepEqual(runFeature({ notice: "NOTICE.md", topic: "private-history", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      reference: null
    });
  });
  it("denies bad values with url, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ notice: "a://b", topic: "private-history" }), {
      decision: "deny",
      reason: "bad-value",
      reference: null
    });
    assert.deepEqual(runFeature({ notice: "NOTICE.md", topic: "a..b" }), {
      decision: "deny",
      reason: "bad-value",
      reference: null
    });
    assert.deepEqual(runFeature({ notice: "a\\b", topic: "private-history" }), {
      decision: "deny",
      reason: "bad-value",
      reference: null
    });
  });
  it("denies missing or non-string notice and topic", () => {
    assert.deepEqual(runFeature({ topic: "private-history" }), {
      decision: "deny",
      reason: "bad-notice",
      reference: null
    });
    assert.deepEqual(runFeature({ notice: 7, topic: "private-history" }), {
      decision: "deny",
      reason: "bad-notice",
      reference: null
    });
    assert.deepEqual(runFeature({ notice: "NOTICE.md" }), {
      decision: "deny",
      reason: "bad-topic",
      reference: null
    });
    assert.deepEqual(runFeature({ notice: "NOTICE.md", topic: 7 }), {
      decision: "deny",
      reason: "bad-topic",
      reference: null
    });
  });
  it("preserves input and is deterministic", () => {
    const input = { notice: "NOTICE.md", topic: "private-history" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(first, second);
    assert.notStrictEqual(first, second);
    assert.notStrictEqual(first.reference, input);
  });
  it("returns decision plus reason plus reference shape", () => {
    const result = runFeature({ notice: "NOTICE.md", topic: "private-history" });
    assert.equal(result.decision, "allow");
    assert.equal(typeof result.reason, "string");
    assert.deepEqual(result.reference, { notice: "NOTICE.md", topic: "private-history" });
  });
});
