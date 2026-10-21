import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/open_content_boundary_gate.mjs";

describe("open content boundary gate", () => {
  it("allows gameplay-source with code-only", () => {
    assert.deepEqual(runFeature({ content: "gameplay-source", basis: "code-only" }), {
      decision: "allow",
      reason: "ok-code-only",
      boundary: { content: "gameplay-source", basis: "code-only" }
    });
  });
  it("allows local-save with code-only", () => {
    assert.deepEqual(runFeature({ content: "local-save", basis: "code-only" }), {
      decision: "allow",
      reason: "ok-code-only",
      boundary: { content: "local-save", basis: "code-only" }
    });
  });
  it("allows procedural-fallback with code-only", () => {
    assert.deepEqual(runFeature({ content: "procedural-fallback", basis: "code-only" }), {
      decision: "allow",
      reason: "ok-code-only",
      boundary: { content: "procedural-fallback", basis: "code-only" }
    });
  });
  it("denies image as excluded-material", () => {
    assert.deepEqual(runFeature({ content: "image", basis: "code-only" }), {
      decision: "deny",
      reason: "excluded-material",
      boundary: null
    });
  });
  it("denies recorded-voice as excluded-material", () => {
    assert.deepEqual(runFeature({ content: "recorded-voice", basis: "code-only" }), {
      decision: "deny",
      reason: "excluded-material",
      boundary: null
    });
  });
  it("denies cloud basis as unknown-basis", () => {
    assert.deepEqual(runFeature({ content: "gameplay-source", basis: "cloud" }), {
      decision: "deny",
      reason: "unknown-basis",
      boundary: null
    });
  });
  it("denies non-object payload as bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", boundary: null });
    assert.deepEqual(runFeature("gameplay-source"), { decision: "deny", reason: "bad-payload", boundary: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", boundary: null });
    assert.deepEqual(runFeature([{ content: "gameplay-source" }]), { decision: "deny", reason: "bad-payload", boundary: null });
  });
  it("denies extra key as unknown-field", () => {
    assert.deepEqual(runFeature({ content: "gameplay-source", basis: "code-only", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      boundary: null
    });
  });
  it("denies bad-value for url-like, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ content: "gameplay-source", basis: "http://x" }), {
      decision: "deny",
      reason: "bad-value",
      boundary: null
    });
    assert.deepEqual(runFeature({ content: "a\\b", basis: "code-only" }), {
      decision: "deny",
      reason: "bad-value",
      boundary: null
    });
    assert.deepEqual(runFeature({ content: "a..b", basis: "code-only" }), {
      decision: "deny",
      reason: "bad-value",
      boundary: null
    });
  });
  it("denies missing content as bad-content and unknown content", () => {
    assert.deepEqual(runFeature({ basis: "code-only" }), { decision: "deny", reason: "bad-content", boundary: null });
    assert.deepEqual(runFeature({ content: "song", basis: "code-only" }), { decision: "deny", reason: "unknown-content", boundary: null });
  });
  it("denies missing basis as bad-basis", () => {
    assert.deepEqual(runFeature({ content: "gameplay-source" }), { decision: "deny", reason: "bad-basis", boundary: null });
  });
  it("denies model-3d and marketing-material as excluded-material", () => {
    assert.deepEqual(runFeature({ content: "model-3d", basis: "code-only" }), { decision: "deny", reason: "excluded-material", boundary: null });
    assert.deepEqual(runFeature({ content: "marketing-material", basis: "code-only" }), { decision: "deny", reason: "excluded-material", boundary: null });
  });
  it("preserves input object", () => {
    const payload = { content: "gameplay-source", basis: "code-only" };
    const before = JSON.stringify(payload);
    runFeature(payload);
    assert.equal(JSON.stringify(payload), before);
  });
});
