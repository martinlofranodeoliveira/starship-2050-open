import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/denial_code_mapping_gate.mjs";

describe("denial code mapping gate", () => {
  it("allows symlink denial with 404", () => {
    const input = { denial: "symlink", code: 404 };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, { decision: "allow", reason: "ok-mapping", mapping: { denial: "symlink", code: 404 } });
    assert.equal(JSON.stringify(input), before);
  });

  it("allows bad-method denial with 405", () => {
    const input = { denial: "bad-method", code: 405 };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, { decision: "allow", reason: "ok-mapping", mapping: { denial: "bad-method", code: 405 } });
    assert.equal(JSON.stringify(input), before);
  });

  it("denies traversal denial with 405 as mismatch-code", () => {
    const result = runFeature({ denial: "traversal", code: 405 });
    assert.deepEqual(result, { decision: "deny", reason: "mismatch-code", mapping: null });
  });

  it("denies unknown denial with 404 as unknown-denial", () => {
    const result = runFeature({ denial: "nope", code: 404 });
    assert.deepEqual(result, { decision: "deny", reason: "unknown-denial", mapping: null });
  });

  it("denies missing code as bad-code and preserves input", () => {
    const input = { denial: "symlink" };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, { decision: "deny", reason: "bad-code", mapping: null });
    assert.equal(JSON.stringify(input), before);
  });

  it("denies extra field as unknown-field", () => {
    const result = runFeature({ denial: "symlink", code: 404, extra: 1 });
    assert.deepEqual(result, { decision: "deny", reason: "unknown-field", mapping: null });
  });

  it("denies string value containing dotdot as bad-value", () => {
    const result = runFeature({ denial: "a..b", code: 404 });
    assert.deepEqual(result, { decision: "deny", reason: "bad-value", mapping: null });
  });

  it("denies string value containing colon-slash-slash as bad-value", () => {
    const result = runFeature({ denial: "symlink", code: 404, extra2: "x" });
    assert.deepEqual({ decision: "deny", reason: "unknown-field", mapping: null }, runFeature({ denial: "symlink", code: 404, extra2: "x" }));
    assert.deepEqual(runFeature({ denial: "https://x", code: 404 }), { decision: "deny", reason: "bad-value", mapping: null });
    assert.deepEqual(result, { decision: "deny", reason: "unknown-field", mapping: null });
  });

  it("denies string value containing backslash as bad-value", () => {
    const result = runFeature({ denial: "a\\b", code: 404 });
    assert.deepEqual(result, { decision: "deny", reason: "bad-value", mapping: null });
  });

  it("denies non-object payload as bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", mapping: null });
    assert.deepEqual(runFeature([{ denial: "symlink", code: 404 }]), { decision: "deny", reason: "bad-payload", mapping: null });
    assert.deepEqual(runFeature("symlink"), { decision: "deny", reason: "bad-payload", mapping: null });
  });

  it("denies missing denial as bad-denial", () => {
    assert.deepEqual(runFeature({ code: 404 }), { decision: "deny", reason: "bad-denial", mapping: null });
    assert.deepEqual(runFeature({ denial: 123, code: 404 }), { decision: "deny", reason: "bad-denial", mapping: null });
  });

  it("denies unknown code as unknown-code", () => {
    assert.deepEqual(runFeature({ denial: "symlink", code: 500 }), { decision: "deny", reason: "unknown-code", mapping: null });
    assert.deepEqual(runFeature({ denial: "symlink", code: "404" }), { decision: "deny", reason: "bad-code", mapping: null });
  });

  it("denies bad-method with 404 as mismatch-code", () => {
    assert.deepEqual(runFeature({ denial: "bad-method", code: 404 }), { decision: "deny", reason: "mismatch-code", mapping: null });
  });

  it("allows remaining 404 pairings", () => {
    assert.deepEqual(runFeature({ denial: "outside-root", code: 404 }), { decision: "allow", reason: "ok-mapping", mapping: { denial: "outside-root", code: 404 } });
    assert.deepEqual(runFeature({ denial: "dotfile", code: 404 }), { decision: "allow", reason: "ok-mapping", mapping: { denial: "dotfile", code: 404 } });
    assert.deepEqual(runFeature({ denial: "traversal", code: 404 }), { decision: "allow", reason: "ok-mapping", mapping: { denial: "traversal", code: 404 } });
    assert.deepEqual(runFeature({ denial: "private", code: 404 }), { decision: "allow", reason: "ok-mapping", mapping: { denial: "private", code: 404 } });
  });
});
