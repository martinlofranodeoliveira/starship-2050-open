import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/open_license_notice_gate.mjs";

describe("open license notice gate", () => {
  it("allows LICENSE with NOTICE.md", () => {
    const input = { license: "LICENSE", notice: "NOTICE.md" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "allow", reason: "ok-docs", docs: { license: "LICENSE", notice: "NOTICE.md" } });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies unknown license while preserving input", () => {
    const input = { license: "MIT", notice: "NOTICE.md" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "deny", reason: "unknown-license", docs: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies unknown notice while preserving input", () => {
    const input = { license: "LICENSE", notice: "README.md" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "deny", reason: "unknown-notice", docs: null });
    assert.equal(JSON.stringify(input), before);
  });
  it("denies bad payload", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature([{ license: "LICENSE", notice: "NOTICE.md" }]), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature("LICENSE"), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(true), { decision: "deny", reason: "bad-payload", docs: null });
  });
  it("denies unknown field", () => {
    const input = { license: "LICENSE", notice: "NOTICE.md", extra: "x" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "deny", reason: "unknown-field", docs: null });
    assert.equal(JSON.stringify(input), before);
    assert.deepStrictEqual(runFeature({ docs: "LICENSE" }), { decision: "deny", reason: "unknown-field", docs: null });
  });
  it("denies bad values with colon-slash-slash backslash or dotdot", () => {
    assert.deepStrictEqual(runFeature({ license: "https://example", notice: "NOTICE.md" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE", notice: "https://example" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LIC\\ENSE", notice: "NOTICE.md" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE", notice: "NOT\\ICE.md" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LIC..ENSE", notice: "NOTICE.md" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE", notice: "../NOTICE.md" }), { decision: "deny", reason: "bad-value", docs: null });
  });
  it("denies missing or non-string license or notice", () => {
    assert.deepStrictEqual(runFeature({ notice: "NOTICE.md" }), { decision: "deny", reason: "bad-license", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE" }), { decision: "deny", reason: "bad-notice", docs: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-license", docs: null });
    assert.deepStrictEqual(runFeature({ license: 42, notice: "NOTICE.md" }), { decision: "deny", reason: "bad-license", docs: null });
    assert.deepStrictEqual(runFeature({ license: null, notice: "NOTICE.md" }), { decision: "deny", reason: "bad-license", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE", notice: 42 }), { decision: "deny", reason: "bad-notice", docs: null });
    assert.deepStrictEqual(runFeature({ license: "LICENSE", notice: null }), { decision: "deny", reason: "bad-notice", docs: null });
  });
  it("is deterministic and returns plain JSON", () => {
    const input = { license: "LICENSE", notice: "NOTICE.md" };
    const first = runFeature(input);
    const second = runFeature({ license: "LICENSE", notice: "NOTICE.md" });
    assert.deepStrictEqual(first, second);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
    const denied = runFeature({ license: "MIT", notice: "NOTICE.md" });
    assert.deepStrictEqual(runFeature({ license: "MIT", notice: "NOTICE.md" }), denied);
  });
  it("uses pure deterministic source without banned access", () => {
    const src = runFeature.toString();
    assert.ok(src.includes("for"));
    assert.ok(src.includes("of"));
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes(".get("));
    assert.ok(src.includes(".set("));
    const banned = ["Date", "process", "random", "fetch", "prototype", "constructor", "async", "class", "require"];
    for (const token of banned) {
      assert.ok(!src.includes(token), "should not contain " + token);
    }
    assert.ok(!/\[[A-Za-z_$][A-Za-z0-9_$]*\]/.test(src), "should not use variable-index access");
  });
});
