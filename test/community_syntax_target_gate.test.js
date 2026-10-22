import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/syntax_target_gate.mjs";

describe("syntax target gate", () => {
  it("allows js/game.js with check syntax", () => {
    const input = { check: "syntax", path: "js/game.js" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "allow", reason: "ok-syntax", subject: { path: "js/game.js", check: "syntax" } });
    assert.equal(JSON.stringify(input), before);
  });
  it("allows server.js with check syntax", () => {
    const input = { path: "server.js", check: "syntax" };
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "allow", reason: "ok-syntax", subject: { path: "server.js", check: "syntax" } });
  });
  it("denies unknown path with unknown-path and null subject", () => {
    const input = { path: "css/style.css", check: "syntax" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "unknown-path", subject: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies unknown check with unknown-check and null subject", () => {
    const input = { path: "js/game.js", check: "serve" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "unknown-check", subject: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies bad payload deterministically", () => {
    for (const bad of [null, undefined, 42, "x", [1], [{ path: "server.js" }]]) {
      const a = runFeature(bad);
      const b = runFeature(bad);
      assert.deepEqual(a, { decision: "deny", reason: "bad-payload", subject: null });
      assert.deepEqual(b, a);
    }
  });
  it("denies unknown field", () => {
    const out = runFeature({ path: "server.js", check: "syntax", extra: "no" });
    assert.deepEqual(out, { decision: "deny", reason: "unknown-field", subject: null });
  });
  it("denies bad values containing :// backslash or dotdot", () => {
    assert.deepEqual(runFeature({ path: "https://example.com", check: "syntax" }), { decision: "deny", reason: "bad-value", subject: null });
    assert.deepEqual(runFeature({ path: "server.js", check: "syn..tax" }), { decision: "deny", reason: "bad-value", subject: null });
    assert.deepEqual(runFeature({ path: "a\\b", check: "syntax" }), { decision: "deny", reason: "bad-value", subject: null });
  });
  it("denies bad path and bad check", () => {
    assert.deepEqual(runFeature({ check: "syntax" }), { decision: "deny", reason: "bad-path", subject: null });
    assert.deepEqual(runFeature({ path: 7, check: "syntax" }), { decision: "deny", reason: "bad-path", subject: null });
    assert.deepEqual(runFeature({ path: "server.js" }), { decision: "deny", reason: "bad-check", subject: null });
    assert.deepEqual(runFeature({ path: "server.js", check: 7 }), { decision: "deny", reason: "bad-check", subject: null });
  });
  it("is deterministic and preserves input", () => {
    const input = { path: "server.js", check: "syntax" };
    const snapshot = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(JSON.parse(snapshot));
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(input), snapshot);
  });
});
