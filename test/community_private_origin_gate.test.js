import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/private_origin_gate.mjs";

describe("private_origin_gate", () => {
  it("accepts private plus separate", () => {
    assert.deepEqual(runFeature({ origin: "private", history: "separate" }), {
      decision: "allow",
      reason: "ok-preserved",
      preserved: { origin: "private", history: "separate" }
    });
  });
  it("accepts reversed key order", () => {
    assert.deepEqual(runFeature({ history: "separate", origin: "private" }), {
      decision: "allow",
      reason: "ok-preserved",
      preserved: { origin: "private", history: "separate" }
    });
  });
  it("rejects wrong origin string", () => {
    assert.deepEqual(runFeature({ origin: "public", history: "separate" }), {
      decision: "deny",
      reason: "unknown-origin",
      preserved: null
    });
  });
  it("rejects wrong history string", () => {
    assert.deepEqual(runFeature({ origin: "private", history: "shared" }), {
      decision: "deny",
      reason: "unknown-history",
      preserved: null
    });
  });
  it("rejects missing origin", () => {
    assert.deepEqual(runFeature({ history: "separate" }), {
      decision: "deny",
      reason: "bad-origin",
      preserved: null
    });
  });
  it("rejects missing history", () => {
    assert.deepEqual(runFeature({ origin: "private" }), {
      decision: "deny",
      reason: "bad-history",
      preserved: null
    });
  });
  it("rejects non-string origin and history", () => {
    assert.deepEqual(runFeature({ origin: 7, history: "separate" }), {
      decision: "deny",
      reason: "bad-origin",
      preserved: null
    });
    assert.deepEqual(runFeature({ origin: "private", history: 7 }), {
      decision: "deny",
      reason: "bad-history",
      preserved: null
    });
  });
  it("rejects non-object and array payloads", () => {
    for (const bad of [null, 42, "private", true, [], [{ origin: "private" }]]) {
      assert.deepEqual(runFeature(bad), {
        decision: "deny",
        reason: "bad-payload",
        preserved: null
      });
    }
  });
  it("rejects unknown fields", () => {
    assert.deepEqual(runFeature({ origin: "private", history: "separate", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      preserved: null
    });
  });
  it("rejects colon-slash-slash values", () => {
    assert.deepEqual(runFeature({ origin: "a://b", history: "separate" }), {
      decision: "deny",
      reason: "bad-value",
      preserved: null
    });
  });
  it("rejects backslash values", () => {
    assert.deepEqual(runFeature({ origin: "private", history: "a\\b" }), {
      decision: "deny",
      reason: "bad-value",
      preserved: null
    });
  });
  it("rejects dotdot values", () => {
    assert.deepEqual(runFeature({ origin: "private", history: "a..b" }), {
      decision: "deny",
      reason: "bad-value",
      preserved: null
    });
  });
  it("preserves input and is deterministic", () => {
    const input = { origin: "private", history: "separate" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ origin: "private", history: "separate" });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(Object.keys(first).sort(), ["decision", "preserved", "reason"]);
  });
});
