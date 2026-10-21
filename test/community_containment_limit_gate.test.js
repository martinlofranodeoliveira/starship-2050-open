import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/containment_limit_gate.mjs";

describe("containment limit gate", () => {
  it("allows no-sandbox", () => {
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "no-sandbox" }), { decision: "allow", reason: "ok-limit", bounds: { guard: "lstat-realpath", limit: "no-sandbox" } });
  });
  it("allows remaining bounded limits", () => {
    for (const limit of ["no-toctou", "no-follow", "no-inside-symlink", "no-permissions"]) {
      assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit }), { decision: "allow", reason: "ok-limit", bounds: { guard: "lstat-realpath", limit } });
    }
  });
  it("denies overclaimed limits", () => {
    for (const limit of ["sandbox", "toctou-proof", "follow-targets", "allow-inside-symlink", "replace-permissions"]) {
      assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit }), { decision: "deny", reason: "overclaim-limit", bounds: null });
    }
  });
  it("denies bad payloads", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", bounds: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", bounds: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", bounds: null });
    assert.deepStrictEqual(runFeature("x"), { decision: "deny", reason: "bad-payload", bounds: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", bounds: null });
  });
  it("denies unknown fields", () => {
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "no-sandbox", extra: "x" }), { decision: "deny", reason: "unknown-field", bounds: null });
    assert.deepStrictEqual(runFeature({ foo: "bar" }), { decision: "deny", reason: "unknown-field", bounds: null });
  });
  it("denies bad values", () => {
    const backslash = String.fromCharCode(92);
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "https://example" }), { decision: "deny", reason: "bad-value", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "a" + backslash + "b" }), { decision: "deny", reason: "bad-value", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "a..b" }), { decision: "deny", reason: "bad-value", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "lstat-real" + "..", limit: "no-sandbox" }), { decision: "deny", reason: "bad-value", bounds: null });
  });
  it("denies bad and unknown guards", () => {
    assert.deepStrictEqual(runFeature({ limit: "no-sandbox" }), { decision: "deny", reason: "bad-guard", bounds: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-guard", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: 1, limit: "no-sandbox" }), { decision: "deny", reason: "bad-guard", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "other", limit: "no-sandbox" }), { decision: "deny", reason: "unknown-guard", bounds: null });
  });
  it("denies bad and unknown limits", () => {
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath" }), { decision: "deny", reason: "bad-limit", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: 1 }), { decision: "deny", reason: "bad-limit", bounds: null });
    assert.deepStrictEqual(runFeature({ guard: "lstat-realpath", limit: "nope" }), { decision: "deny", reason: "unknown-limit", bounds: null });
  });
  it("preserves input and stays deterministic JSON", () => {
    const input = { guard: "lstat-realpath", limit: "no-follow" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ guard: "lstat-realpath", limit: "no-follow" });
    assert.deepStrictEqual(first, second);
    assert.equal(JSON.stringify(input), before);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
    assert.equal(typeof first.then, "undefined");
  });
});
