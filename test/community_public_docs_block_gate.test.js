import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/public_docs_block_gate.mjs";

describe("public docs block gate", () => {
  it("allows public-docs-pt v1", () => {
    const out = runFeature({ block: "public-docs-pt", version: "v1" });
    assert.deepStrictEqual(out, { decision: "allow", reason: "ok-docs", docs: { block: "public-docs-pt", version: "v1" } });
  });

  it("denies unknown block without mutating input", () => {
    const input = { block: "other", version: "v1" };
    const before = JSON.stringify(input);
    const out = runFeature(input);
    assert.deepStrictEqual(out, { decision: "deny", reason: "unknown-block", docs: null });
    assert.strictEqual(JSON.stringify(input), before);
    assert.deepStrictEqual(input, { block: "other", version: "v1" });
  });

  it("denies unknown version", () => {
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: "v2" }), { decision: "deny", reason: "unknown-version", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: "next" }), { decision: "deny", reason: "unknown-version", docs: null });
  });

  it("denies non-object and array payloads", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature("public-docs-pt"), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature(true), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", docs: null });
    assert.deepStrictEqual(runFeature([{ block: "public-docs-pt", version: "v1" }]), { decision: "deny", reason: "bad-payload", docs: null });
  });

  it("denies unknown fields", () => {
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: "v1", extra: "x" }), { decision: "deny", reason: "unknown-field", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", locale: "pt" }), { decision: "deny", reason: "unknown-field", docs: null });
  });

  it("denies bad values containing traversal or scheme markers", () => {
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: "https://example" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ block: "a://b", version: "v1" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt\\x", version: "v1" }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: ".." }), { decision: "deny", reason: "bad-value", docs: null });
    assert.deepStrictEqual(runFeature({ block: "..", version: "v1" }), { decision: "deny", reason: "bad-value", docs: null });
  });

  it("denies missing or non-string block and version", () => {
    assert.deepStrictEqual(runFeature({ version: "v1" }), { decision: "deny", reason: "bad-block", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt" }), { decision: "deny", reason: "bad-version", docs: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-block", docs: null });
    assert.deepStrictEqual(runFeature({ block: 7, version: "v1" }), { decision: "deny", reason: "bad-block", docs: null });
    assert.deepStrictEqual(runFeature({ block: "public-docs-pt", version: 1 }), { decision: "deny", reason: "bad-version", docs: null });
    assert.deepStrictEqual(runFeature({ block: null, version: "v1" }), { decision: "deny", reason: "bad-block", docs: null });
  });

  it("is deterministic, preserves input and returns JSON values", () => {
    const input = { block: "public-docs-pt", version: "v1" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ block: "public-docs-pt", version: "v1" });
    assert.deepStrictEqual(first, second);
    assert.strictEqual(JSON.stringify(input), before);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
    assert.notStrictEqual(first.docs, input);
  });

  it("exposes a pure function without I/O or clock identifiers", () => {
    assert.strictEqual(typeof runFeature, "function");
    const src = runFeature.toString();
    assert.strictEqual(src.includes("Date"), false);
    assert.strictEqual(src.includes("process"), false);
    assert.strictEqual(src.includes("require"), false);
    assert.strictEqual(src.includes("fetch"), false);
    assert.strictEqual(src.includes("random"), false);
  });
});
