import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/excluded_offering_gate.mjs";

describe("excluded offering gate", () => {
  it("allows leaderboard excluded", () => {
    const input = { offering: "leaderboard", availability: "excluded" };
    const snapshot = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "allow",
      reason: "ok-excluded",
      exclusion: { offering: "leaderboard", availability: "excluded" }
    });
    assert.strictEqual(JSON.stringify(input), snapshot);
  });

  it("allows sdk excluded", () => {
    const input = { offering: "sdk", availability: "excluded" };
    const snapshot = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "allow",
      reason: "ok-excluded",
      exclusion: { offering: "sdk", availability: "excluded" }
    });
    assert.strictEqual(JSON.stringify(input), snapshot);
  });

  it("allows production excluded", () => {
    const input = { offering: "production", availability: "excluded" };
    const snapshot = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "allow",
      reason: "ok-excluded",
      exclusion: { offering: "production", availability: "excluded" }
    });
    assert.strictEqual(JSON.stringify(input), snapshot);
  });

  it("denies production included as overclaim", () => {
    const input = { offering: "production", availability: "included" };
    const snapshot = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "deny",
      reason: "overclaim-availability",
      exclusion: null
    });
    assert.strictEqual(JSON.stringify(input), snapshot);
  });

  it("denies null payload and preserves input", () => {
    const input = null;
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "deny",
      reason: "bad-payload",
      exclusion: null
    });
    assert.strictEqual(input, null);
  });

  it("denies unknown field", () => {
    const input = { offering: "sdk", availability: "excluded", extra: "x" };
    const snapshot = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "deny",
      reason: "unknown-field",
      exclusion: null
    });
    assert.strictEqual(JSON.stringify(input), snapshot);
  });

  it("denies array payload as bad-payload", () => {
    const input = [{ offering: "sdk", availability: "excluded" }];
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "deny",
      reason: "bad-payload",
      exclusion: null
    });
  });

  it("denies bad value containing path traversal", () => {
    const input = { offering: "sdk..", availability: "excluded" };
    const result = runFeature(input);
    assert.deepStrictEqual(result, {
      decision: "deny",
      reason: "bad-value",
      exclusion: null
    });
  });
});
