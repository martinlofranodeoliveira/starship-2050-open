import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/preserved_reference_section_gate.mjs";

describe("preserved reference section gate bad-payload", () => {
  it("rejects null", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", reference: null });
  });
  it("rejects array", () => {
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", reference: null });
  });
  it("rejects array payload with entries", () => {
    assert.deepEqual(runFeature(["original"]), { decision: "deny", reason: "bad-payload", reference: null });
  });
  it("rejects non-object payloads", () => {
    assert.deepEqual(runFeature("original"), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", reference: null });
    assert.deepEqual(runFeature(true), { decision: "deny", reason: "bad-payload", reference: null });
  });
  it("does not mutate payload", () => {
    const payload = { reference: "original", section: "apis" };
    const before = JSON.stringify(payload);
    runFeature(payload);
    runFeature(null);
    assert.equal(JSON.stringify(payload), before);
  });
});

describe("preserved reference section gate unknown-field", () => {
  it("rejects extra keys", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "apis", extra: "x" }), { decision: "deny", reason: "unknown-field", reference: null });
  });
  it("rejects only unknown key", () => {
    assert.deepEqual(runFeature({ other: "x" }), { decision: "deny", reason: "unknown-field", reference: null });
  });
  it("rejects empty-string key", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "apis", "": "x" }), { decision: "deny", reason: "unknown-field", reference: null });
  });
});

describe("preserved reference section gate bad-value", () => {
  it("rejects colon-slash-slash", () => {
    assert.deepEqual(runFeature({ reference: "https://example", section: "apis" }), { decision: "deny", reason: "bad-value", reference: null });
    assert.deepEqual(runFeature({ reference: "original", section: "a://b" }), { decision: "deny", reason: "bad-value", reference: null });
  });
  it("rejects backslash", () => {
    assert.deepEqual(runFeature({ reference: "a\\b", section: "apis" }), { decision: "deny", reason: "bad-value", reference: null });
    assert.deepEqual(runFeature({ reference: "original", section: "a\\b" }), { decision: "deny", reason: "bad-value", reference: null });
  });
  it("rejects dotdot", () => {
    assert.deepEqual(runFeature({ reference: "a..b", section: "apis" }), { decision: "deny", reason: "bad-value", reference: null });
    assert.deepEqual(runFeature({ reference: "original", section: ".." }), { decision: "deny", reason: "bad-value", reference: null });
  });
});

describe("preserved reference section gate allow", () => {
  it("accepts apis", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "apis" }), { decision: "allow", reason: "ok-preserved", reference: { reference: "original", section: "apis" } });
  });
  it("accepts examples", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "examples" }), { decision: "allow", reason: "ok-preserved", reference: { reference: "original", section: "examples" } });
  });
  it("accepts limits", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "limits" }), { decision: "allow", reason: "ok-preserved", reference: { reference: "original", section: "limits" } });
  });
  it("accepts history", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "history" }), { decision: "allow", reason: "ok-preserved", reference: { reference: "original", section: "history" } });
  });
  it("is deterministic", () => {
    const first = runFeature({ reference: "original", section: "apis" });
    const second = runFeature({ reference: "original", section: "apis" });
    assert.deepEqual(first, second);
  });
});

describe("preserved reference section gate reference checks", () => {
  it("rejects missing reference", () => {
    assert.deepEqual(runFeature({ section: "apis" }), { decision: "deny", reason: "bad-reference", reference: null });
  });
  it("rejects non-string reference", () => {
    assert.deepEqual(runFeature({ reference: 42, section: "apis" }), { decision: "deny", reason: "bad-reference", reference: null });
    assert.deepEqual(runFeature({ reference: null, section: "apis" }), { decision: "deny", reason: "bad-reference", reference: null });
  });
  it("rejects unknown reference", () => {
    assert.deepEqual(runFeature({ reference: "copy", section: "apis" }), { decision: "deny", reason: "unknown-reference", reference: null });
    assert.deepEqual(runFeature({ reference: "Original", section: "apis" }), { decision: "deny", reason: "unknown-reference", reference: null });
  });
});

describe("preserved reference section gate section checks", () => {
  it("rejects missing section", () => {
    assert.deepEqual(runFeature({ reference: "original" }), { decision: "deny", reason: "bad-section", reference: null });
  });
  it("rejects non-string section", () => {
    assert.deepEqual(runFeature({ reference: "original", section: 7 }), { decision: "deny", reason: "bad-section", reference: null });
    assert.deepEqual(runFeature({ reference: "original", section: null }), { decision: "deny", reason: "bad-section", reference: null });
  });
  it("rejects unknown section", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "cloud" }), { decision: "deny", reason: "unknown-section", reference: null });
    assert.deepEqual(runFeature({ reference: "original", section: "APIs" }), { decision: "deny", reason: "unknown-section", reference: null });
  });
  it("matches contract example for cloud", () => {
    assert.deepEqual(runFeature({ reference: "original", section: "cloud" }), { decision: "deny", reason: "unknown-section", reference: null });
  });
});
