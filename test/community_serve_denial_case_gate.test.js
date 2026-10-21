import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/serve_denial_case_gate.mjs";

describe("serve denial case gate", () => {
  it("accepts private-path", () => {
    const out = runFeature({ validation: "serve", case: "private-path" });
    assert.deepEqual(out, { decision: "allow", reason: "ok-serve", coverage: { validation: "serve", case: "private-path" } });
  });
  it("accepts write-method", () => {
    const out = runFeature({ validation: "serve", case: "write-method" });
    assert.deepEqual(out, { decision: "allow", reason: "ok-serve", coverage: { validation: "serve", case: "write-method" } });
  });
  it("accepts remaining allow cases", () => {
    for (const name of ["dotfile", "traversal", "symlink", "outside-root"]) {
      const input = { validation: "serve", case: name };
      const out = runFeature(input);
      assert.deepEqual(out, { decision: "allow", reason: "ok-serve", coverage: { validation: "serve", case: name } });
    }
  });
  it("accepts reversed key order", () => {
    const out = runFeature({ case: "private-path", validation: "serve" });
    assert.deepEqual(out, { decision: "allow", reason: "ok-serve", coverage: { validation: "serve", case: "private-path" } });
  });
  it("denies unknown validation without mutation", () => {
    const input = { validation: "syntax", case: "private-path" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "unknown-validation", coverage: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies unknown case without mutation", () => {
    const input = { validation: "serve", case: "nope" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "unknown-case", coverage: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("rejects colon-slash-slash value and preserves input", () => {
    const input = { validation: "serve", case: "https://example.com" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "bad-value", coverage: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("rejects backslash value and preserves input", () => {
    const input = { validation: "serve", case: "a\\b" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "bad-value", coverage: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("rejects dotdot value and preserves input", () => {
    const input = { validation: "serve", case: "a..b" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepEqual(out, { decision: "deny", reason: "bad-value", coverage: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies bad payload variants", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", coverage: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", coverage: null });
    assert.deepEqual(runFeature("serve"), { decision: "deny", reason: "bad-payload", coverage: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", coverage: null });
  });
  it("denies unknown field", () => {
    const out = runFeature({ validation: "serve", case: "private-path", extra: "x" });
    assert.deepEqual(out, { decision: "deny", reason: "unknown-field", coverage: null });
  });
  it("denies missing or non-string validation and case", () => {
    assert.deepEqual(runFeature({ case: "private-path" }), { decision: "deny", reason: "bad-validation", coverage: null });
    assert.deepEqual(runFeature({ validation: 7, case: "private-path" }), { decision: "deny", reason: "bad-validation", coverage: null });
    assert.deepEqual(runFeature({ validation: "serve" }), { decision: "deny", reason: "bad-case", coverage: null });
    assert.deepEqual(runFeature({ validation: "serve", case: 7 }), { decision: "deny", reason: "bad-case", coverage: null });
  });
});
