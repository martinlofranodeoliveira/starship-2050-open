import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/disclosure_channel_permit_gate.mjs";

describe("disclosure channel permit gate", () => {
  it("allows issue with synthetic", () => {
    assert.deepEqual(runFeature({ channel: "issue", content: "synthetic" }), {
      decision: "allow",
      reason: "ok-disclosure",
      permit: { channel: "issue", content: "synthetic" }
    });
  });
  it("allows pull with technical", () => {
    assert.deepEqual(runFeature({ channel: "pull", content: "technical" }), {
      decision: "allow",
      reason: "ok-disclosure",
      permit: { channel: "pull", content: "technical" }
    });
  });
  it("allows example with synthetic and capture with technical", () => {
    assert.deepEqual(runFeature({ channel: "example", content: "synthetic" }), {
      decision: "allow",
      reason: "ok-disclosure",
      permit: { channel: "example", content: "synthetic" }
    });
    assert.deepEqual(runFeature({ channel: "capture", content: "technical" }), {
      decision: "allow",
      reason: "ok-disclosure",
      permit: { channel: "capture", content: "technical" }
    });
  });
  it("denies capture with secret", () => {
    assert.deepEqual(runFeature({ channel: "capture", content: "secret" }), {
      decision: "deny",
      reason: "denied-secret",
      permit: null
    });
  });
  it("denies example with third-party", () => {
    assert.deepEqual(runFeature({ channel: "example", content: "third-party" }), {
      decision: "deny",
      reason: "denied-third-party",
      permit: null
    });
  });
  it("denies non-object or array payloads", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", permit: null });
    assert.deepEqual(runFeature("issue"), { decision: "deny", reason: "bad-payload", permit: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", permit: null });
    assert.deepEqual(runFeature([{ channel: "issue", content: "synthetic" }]), { decision: "deny", reason: "bad-payload", permit: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", permit: null });
  });
  it("denies extra keys", () => {
    assert.deepEqual(runFeature({ channel: "issue", content: "synthetic", extra: "no" }), {
      decision: "deny",
      reason: "unknown-field",
      permit: null
    });
  });
  it("denies missing or non-string channel", () => {
    assert.deepEqual(runFeature({ content: "synthetic" }), { decision: "deny", reason: "bad-channel", permit: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-channel", permit: null });
    assert.deepEqual(runFeature({ channel: 7, content: "synthetic" }), { decision: "deny", reason: "bad-channel", permit: null });
    assert.deepEqual(runFeature({ channel: null, content: "synthetic" }), { decision: "deny", reason: "bad-channel", permit: null });
  });
  it("denies unknown channel strings", () => {
    assert.deepEqual(runFeature({ channel: "chat", content: "synthetic" }), {
      decision: "deny",
      reason: "unknown-channel",
      permit: null
    });
  });
  it("denies missing or non-string content", () => {
    assert.deepEqual(runFeature({ channel: "issue" }), { decision: "deny", reason: "bad-content", permit: null });
    assert.deepEqual(runFeature({ channel: "issue", content: 9 }), { decision: "deny", reason: "bad-content", permit: null });
    assert.deepEqual(runFeature({ channel: "issue", content: null }), { decision: "deny", reason: "bad-content", permit: null });
  });
  it("denies unknown content strings", () => {
    assert.deepEqual(runFeature({ channel: "issue", content: "real" }), {
      decision: "deny",
      reason: "unknown-content",
      permit: null
    });
  });
  it("denies values containing :// backslash or dotdot", () => {
    assert.deepEqual(runFeature({ channel: "issue", content: "a://b" }), { decision: "deny", reason: "bad-value", permit: null });
    assert.deepEqual(runFeature({ channel: "issue", content: "a\\b" }), { decision: "deny", reason: "bad-value", permit: null });
    assert.deepEqual(runFeature({ channel: "issue", content: "a..b" }), { decision: "deny", reason: "bad-value", permit: null });
    assert.deepEqual(runFeature({ channel: "issue://x", content: "synthetic" }), { decision: "deny", reason: "bad-value", permit: null });
  });
  it("preserves input and is deterministic", () => {
    const first = { channel: "issue", content: "synthetic" };
    const snapshot = { channel: "issue", content: "synthetic" };
    const outOne = runFeature(first);
    const outTwo = runFeature(first);
    assert.deepEqual(first, snapshot);
    assert.deepEqual(outOne, outTwo);
    const bad = { channel: "capture", content: "secret" };
    runFeature(bad);
    assert.deepEqual(bad, { channel: "capture", content: "secret" });
  });
});
