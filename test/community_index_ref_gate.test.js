import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/index_ref_gate.mjs";

describe("community index_ref_gate", () => {
  it("allows js/game.js", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js/game.js" }), { decision: "allow", link: { page: "index.html", ref: "js/game.js" }, reason: "ok-link" });
  });
  it("allows css/style.css", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "css/style.css" }), { decision: "allow", link: { page: "index.html", ref: "css/style.css" }, reason: "ok-link" });
  });
  it("denies remote ref with bad-value", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "https://cdn.example.com/game.js" }), { decision: "deny", link: null, reason: "bad-value" });
  });
  it("denies unknown local ref and preserves input", () => {
    const input = { page: "index.html", ref: "js/extra.js" };
    const snapshot = JSON.parse(JSON.stringify(input));
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "deny", link: null, reason: "unknown-ref" });
    assert.deepStrictEqual(input, snapshot);
  });
  it("denies bad payload", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", link: null, reason: "bad-payload" });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", link: null, reason: "bad-payload" });
    assert.deepStrictEqual(runFeature("x"), { decision: "deny", link: null, reason: "bad-payload" });
  });
  it("denies unknown field", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js/game.js", extra: "x" }), { decision: "deny", link: null, reason: "unknown-field" });
  });
  it("denies backslash and dotdot as bad-value", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js\\game.js" }), { decision: "deny", link: null, reason: "bad-value" });
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js/../x.js" }), { decision: "deny", link: null, reason: "bad-value" });
  });
  it("denies bad-page and unknown-page", () => {
    assert.deepStrictEqual(runFeature({ ref: "js/game.js" }), { decision: "deny", link: null, reason: "bad-page" });
    assert.deepStrictEqual(runFeature({ page: 1, ref: "js/game.js" }), { decision: "deny", link: null, reason: "bad-page" });
    assert.deepStrictEqual(runFeature({ page: "other.html", ref: "js/game.js" }), { decision: "deny", link: null, reason: "unknown-page" });
  });
  it("denies bad-ref variants", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html" }), { decision: "deny", link: null, reason: "bad-ref" });
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "" }), { decision: "deny", link: null, reason: "bad-ref" });
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "/js/game.js" }), { decision: "deny", link: null, reason: "bad-ref" });
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js/game.js?v=1" }), { decision: "deny", link: null, reason: "bad-ref" });
  });
  it("denies bad-name for disallowed chars", () => {
    assert.deepStrictEqual(runFeature({ page: "index.html", ref: "js/ga me.js" }), { decision: "deny", link: null, reason: "bad-name" });
  });
  it("is deterministic pure JSON without mutation", () => {
    const input = { page: "index.html", ref: "css/style.css" };
    const snapshot = JSON.parse(JSON.stringify(input));
    const first = runFeature(input);
    const second = runFeature({ page: "index.html", ref: "css/style.css" });
    assert.deepStrictEqual(first, second);
    assert.deepStrictEqual(input, snapshot);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
  });
});
