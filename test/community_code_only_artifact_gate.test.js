import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/code_only_artifact_gate.mjs";

describe("code-only artifact gate", () => {
  it("accepts open edition with gameplay artifact", () => {
    assert.deepEqual(runFeature({ edition: "open", artifact: "gameplay" }), {
      decision: "allow",
      reason: "ok-code",
      code: { edition: "open", artifact: "gameplay" }
    });
  });
  it("accepts code-only edition with source artifact regardless of key order", () => {
    assert.deepEqual(runFeature({ artifact: "source", edition: "code-only" }), {
      decision: "allow",
      reason: "ok-code",
      code: { edition: "code-only", artifact: "source" }
    });
  });
  it("denies excluded image artifact", () => {
    assert.deepEqual(runFeature({ edition: "open", artifact: "image" }), {
      decision: "deny",
      reason: "unknown-artifact",
      code: null
    });
  });
  it("denies unknown marketing edition", () => {
    assert.deepEqual(runFeature({ edition: "marketing", artifact: "gameplay" }), {
      decision: "deny",
      reason: "unknown-edition",
      code: null
    });
  });
  it("denies non-object payloads", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", code: null });
    assert.deepEqual(runFeature("open"), { decision: "deny", reason: "bad-payload", code: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", code: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", code: null });
    assert.deepEqual(runFeature([{ edition: "open", artifact: "gameplay" }]), { decision: "deny", reason: "bad-payload", code: null });
  });
  it("denies extra fields", () => {
    assert.deepEqual(runFeature({ edition: "open", artifact: "gameplay", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      code: null
    });
  });
  it("denies colon-slash-slash values", () => {
    assert.deepEqual(runFeature({ edition: "open", artifact: "https://example" }), {
      decision: "deny",
      reason: "bad-value",
      code: null
    });
  });
  it("denies backslash values", () => {
    assert.deepEqual(runFeature({ edition: "open\\x", artifact: "gameplay" }), {
      decision: "deny",
      reason: "bad-value",
      code: null
    });
  });
  it("denies dotdot values", () => {
    assert.deepEqual(runFeature({ edition: "open", artifact: "a..b" }), {
      decision: "deny",
      reason: "bad-value",
      code: null
    });
  });
  it("denies missing or non-string edition and artifact", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-edition", code: null });
    assert.deepEqual(runFeature({ edition: 7, artifact: "gameplay" }), { decision: "deny", reason: "bad-edition", code: null });
    assert.deepEqual(runFeature({ edition: "open" }), { decision: "deny", reason: "bad-artifact", code: null });
    assert.deepEqual(runFeature({ edition: "open", artifact: 7 }), { decision: "deny", reason: "bad-artifact", code: null });
  });
  it("preserves input and stays deterministic", () => {
    const input = { edition: "open", artifact: "gameplay" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ edition: "open", artifact: "gameplay" });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input, { edition: "open", artifact: "gameplay" });
  });
  it("does not use clock identifiers", () => {
    assert.equal(runFeature.toString().includes("Date"), false);
  });
});
