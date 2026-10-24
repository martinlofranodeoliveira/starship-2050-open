import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/paired_delivery_match_gate.mjs";

describe("paired delivery match gate", () => {
  it("allows matching example pair", () => {
    assert.deepEqual(runFeature({ module: "js/community/example_gate.mjs", test: "test/community_example_gate.test.js" }), {
      decision: "allow",
      reason: "ok-pair",
      pair: { module: "js/community/example_gate.mjs", test: "test/community_example_gate.test.js" }
    });
  });
  it("allows hyphen underscore digits and mixed case cores", () => {
    const r = runFeature({ module: "js/community/Aa0-_X_gate.mjs", test: "test/community_Aa0-_X_gate.test.js" });
    assert.equal(r.decision, "allow");
    assert.equal(r.reason, "ok-pair");
  });
  it("denies mismatch-pair", () => {
    assert.deepEqual(runFeature({ module: "js/community/example_gate.mjs", test: "test/community_other_gate.test.js" }), {
      decision: "deny",
      reason: "mismatch-pair",
      pair: null
    });
  });
  it("denies unknown-field", () => {
    assert.deepEqual(runFeature({ module: "js/community/example_gate.mjs", test: "test/community_example_gate.test.js", extra: "field" }), {
      decision: "deny",
      reason: "unknown-field",
      pair: null
    });
  });
  it("denies bad-payload shapes", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", pair: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", pair: null });
    assert.deepEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", pair: null });
    assert.deepEqual(runFeature(7), { decision: "deny", reason: "bad-payload", pair: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", pair: null });
  });
  it("denies bad-value for scheme and backslash", () => {
    assert.equal(runFeature({ module: "js/community/http://x_gate.mjs", test: "test/community_x_gate.test.js" }).reason, "bad-value");
    assert.equal(runFeature({ module: "js/community/x_gate.mjs", test: "test/community_x_gate.test.js\\" }).reason, "bad-value");
  });
  it("denies bad-module and bad-test", () => {
    assert.equal(runFeature({ test: "test/community_a_gate.test.js" }).reason, "bad-module");
    assert.equal(runFeature({ module: 7, test: "test/community_a_gate.test.js" }).reason, "bad-module");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs" }).reason, "bad-test");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: 7 }).reason, "bad-test");
  });
  it("denies oversized shapes", () => {
    const bigModule = "js/community/" + "a".repeat(120) + "_gate.mjs";
    assert.equal(runFeature({ module: bigModule, test: "test/community_a_gate.test.js" }).reason, "oversized-module");
    const bigTest = "test/community_" + "b".repeat(120) + "_gate.test.js";
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: bigTest }).reason, "oversized-test");
  });
  it("denies unknown-module and unknown-test prefixes", () => {
    assert.equal(runFeature({ module: "js/other/a_gate.mjs", test: "test/community_a_gate.test.js" }).reason, "unknown-module");
    assert.equal(runFeature({ module: "js/community/a.mjs", test: "test/community_a_gate.test.js" }).reason, "unknown-module");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "test/other_a_gate.test.js" }).reason, "unknown-test");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "test/community_a.test.js" }).reason, "unknown-test");
  });
  it("denies empty segments", () => {
    assert.equal(runFeature({ module: "js//community/a_gate.mjs", test: "test/community_a_gate.test.js" }).reason, "unknown-module");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "/test/community_a_gate.test.js" }).reason, "unknown-test");
  });
  it("denies traversal", () => {
    assert.equal(runFeature({ module: "js/community/../a_gate.mjs", test: "test/community_a_gate.test.js" }).reason, "traversal");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "test/../community_a_gate.test.js" }).reason, "traversal");
    assert.equal(runFeature({ module: "js/community/a..b_gate.mjs", test: "test/community_a..b_gate.test.js" }).reason, "traversal");
  });
  it("denies dotfiles", () => {
    assert.equal(runFeature({ module: "js/community/.hidden_gate.mjs", test: "test/community_.hidden_gate.test.js" }).reason, "dotfile");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "test/.hidden_gate.test.js" }).reason, "dotfile");
  });
  it("denies bad-name characters", () => {
    assert.equal(runFeature({ module: "js/community/bad!name_gate.mjs", test: "test/community_bad!name_gate.test.js" }).reason, "bad-name");
    assert.equal(runFeature({ module: "js/community/a_gate.mjs", test: "test/community_bad name_gate.test.js" }).reason, "bad-name");
  });
  it("is deterministic and preserves input", () => {
    const payload = { module: "js/community/example_gate.mjs", test: "test/community_example_gate.test.js" };
    const snapshot = JSON.parse(JSON.stringify(payload));
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(first, second);
    assert.deepEqual(payload, snapshot);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
  });
});
