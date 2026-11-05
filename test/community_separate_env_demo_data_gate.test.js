import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/separate_env_demo_data_gate.mjs";

describe("separate env demo data gate", () => {
  it("allows separate plus fictitious", () => {
    const out = runFeature({ environment: "separate", material: "fictitious" });
    assert.deepStrictEqual(out, { decision: "allow", reason: "ok-demo", hygiene: { environment: "separate", material: "fictitious" } });
  });
  it("denies excluded materials even with separate", () => {
    for (const material of ["env-file", "keys", "database", "upload", "personal"]) {
      const out = runFeature({ environment: "separate", material });
      assert.deepStrictEqual(out, { decision: "deny", reason: "excluded-material", hygiene: null });
    }
  });
  it("denies shared environment", () => {
    assert.deepStrictEqual(runFeature({ environment: "shared", material: "fictitious" }), { decision: "deny", reason: "unknown-environment", hygiene: null });
  });
  it("denies other environments", () => {
    for (const environment of ["production", "shared-history", "local", "Separate"]) {
      const out = runFeature({ environment, material: "fictitious" });
      assert.equal(out.decision, "deny");
      assert.equal(out.reason, "unknown-environment");
      assert.equal(out.hygiene, null);
    }
  });
  it("denies missing or non-string environment", () => {
    assert.deepStrictEqual(runFeature({ material: "fictitious" }), { decision: "deny", reason: "bad-environment", hygiene: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-environment", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: 42, material: "fictitious" }), { decision: "deny", reason: "bad-environment", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: null, material: "fictitious" }), { decision: "deny", reason: "bad-environment", hygiene: null });
  });
  it("denies missing or non-string material", () => {
    assert.deepStrictEqual(runFeature({ environment: "separate" }), { decision: "deny", reason: "bad-material", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate", material: 7 }), { decision: "deny", reason: "bad-material", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate", material: null }), { decision: "deny", reason: "bad-material", hygiene: null });
  });
  it("denies unknown material", () => {
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "real" }), { decision: "deny", reason: "unknown-material", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "Fictitious" }), { decision: "deny", reason: "unknown-material", hygiene: null });
  });
  it("denies bad payloads", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", hygiene: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", hygiene: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", hygiene: null });
    assert.deepStrictEqual(runFeature("separate"), { decision: "deny", reason: "bad-payload", hygiene: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", hygiene: null });
  });
  it("denies unknown fields", () => {
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "fictitious", extra: "x" }), { decision: "deny", reason: "unknown-field", hygiene: null });
  });
  it("denies unsafe markers", () => {
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "a://b" }), { decision: "deny", reason: "bad-value", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "a..b" }), { decision: "deny", reason: "bad-value", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "a\\b" }), { decision: "deny", reason: "bad-value", hygiene: null });
    assert.deepStrictEqual(runFeature({ environment: "separate://x", material: "fictitious" }), { decision: "deny", reason: "bad-value", hygiene: null });
  });
  it("is deterministic and JSON stable", () => {
    const first = runFeature({ environment: "separate", material: "fictitious" });
    const second = runFeature({ environment: "separate", material: "fictitious" });
    assert.deepStrictEqual(first, second);
    assert.equal(JSON.parse(JSON.stringify(first)).decision, "allow");
  });
  it("preserves input", () => {
    const payload = { environment: "separate", material: "fictitious" };
    const snapshot = JSON.stringify(payload);
    runFeature(payload);
    assert.equal(JSON.stringify(payload), snapshot);
  });
  it("denies personal as excluded", () => {
    assert.deepStrictEqual(runFeature({ environment: "separate", material: "personal" }), { decision: "deny", reason: "excluded-material", hygiene: null });
  });
});
