import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/regular_file_site_gate.mjs";

describe("regular-file site gate", () => {
  it("rejects non-object and array payloads with bad-payload", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", entry: null });
    assert.deepStrictEqual(runFeature("regular"), { decision: "deny", reason: "bad-payload", entry: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", entry: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", entry: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", entry: null });
    assert.deepStrictEqual(runFeature([{ kind: "regular", site: "inside" }]), { decision: "deny", reason: "bad-payload", entry: null });
  });
  it("rejects unknown fields with null entry", () => {
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "inside", extra: "x" }), { decision: "deny", reason: "unknown-field", entry: null });
    assert.deepStrictEqual(runFeature({ foo: "bar" }), { decision: "deny", reason: "unknown-field", entry: null });
  });
  it("rejects string values containing :// backslash or dotdot", () => {
    assert.deepStrictEqual(runFeature({ kind: "regular://", site: "inside" }), { decision: "deny", reason: "bad-value", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "https://example" }), { decision: "deny", reason: "bad-value", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "reg\\ular", site: "inside" }), { decision: "deny", reason: "bad-value", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "in..side" }), { decision: "deny", reason: "bad-value", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "..", site: "inside" }), { decision: "deny", reason: "bad-value", entry: null });
  });
  it("rejects missing or non-string kind with bad-kind", () => {
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-kind", entry: null });
    assert.deepStrictEqual(runFeature({ site: "inside" }), { decision: "deny", reason: "bad-kind", entry: null });
    assert.deepStrictEqual(runFeature({ kind: 42, site: "inside" }), { decision: "deny", reason: "bad-kind", entry: null });
    assert.deepStrictEqual(runFeature({ kind: null, site: "inside" }), { decision: "deny", reason: "bad-kind", entry: null });
  });
  it("rejects unknown string kind with unknown-kind", () => {
    assert.deepStrictEqual(runFeature({ kind: "file", site: "inside" }), { decision: "deny", reason: "unknown-kind", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "Regular", site: "inside" }), { decision: "deny", reason: "unknown-kind", entry: null });
  });
  it("rejects missing or non-string site with bad-site", () => {
    assert.deepStrictEqual(runFeature({ kind: "regular" }), { decision: "deny", reason: "bad-site", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: 7 }), { decision: "deny", reason: "bad-site", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: null }), { decision: "deny", reason: "bad-site", entry: null });
  });
  it("rejects unknown string site with unknown-site", () => {
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "middle" }), { decision: "deny", reason: "unknown-site", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "Inside" }), { decision: "deny", reason: "unknown-site", entry: null });
  });
  it("denies non-regular kinds and outside sites with mismatch-file", () => {
    assert.deepStrictEqual(runFeature({ kind: "directory", site: "inside" }), { decision: "deny", reason: "mismatch-file", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "symlink", site: "inside" }), { decision: "deny", reason: "mismatch-file", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "regular", site: "outside" }), { decision: "deny", reason: "mismatch-file", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "directory", site: "outside" }), { decision: "deny", reason: "mismatch-file", entry: null });
    assert.deepStrictEqual(runFeature({ kind: "symlink", site: "outside" }), { decision: "deny", reason: "mismatch-file", entry: null });
  });
  it("allows regular plus inside with ok-file and preserves input", () => {
    const input = { kind: "regular", site: "inside" };
    const first = runFeature(input);
    assert.deepStrictEqual(first, { decision: "allow", reason: "ok-file", entry: { kind: "regular", site: "inside" } });
    assert.deepStrictEqual(input, { kind: "regular", site: "inside" });
    const second = runFeature({ kind: "regular", site: "inside" });
    assert.deepStrictEqual(second, first);
  });
  it("never uses Date", () => {
    assert.strictEqual(runFeature.toString().includes("Date"), false);
  });
});
