import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/zero_install_gate.mjs";

describe("zero-install gate", () => {
  it("allows dependency none and credential none with echo setup", () => {
    assert.deepEqual(runFeature({ dependency: "none", credential: "none" }), {
      decision: "allow",
      reason: "ok-zero",
      setup: { dependency: "none", credential: "none" }
    });
  });

  it("allows reversed key order", () => {
    assert.deepEqual(runFeature({ credential: "none", dependency: "none" }), {
      decision: "allow",
      reason: "ok-zero",
      setup: { dependency: "none", credential: "none" }
    });
  });

  it("rejects null payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", setup: null });
  });

  it("rejects array payload", () => {
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", setup: null });
    assert.deepEqual(runFeature([{ dependency: "none", credential: "none" }]), { decision: "deny", reason: "bad-payload", setup: null });
  });

  it("rejects non-object payloads", () => {
    assert.deepEqual(runFeature("none"), { decision: "deny", reason: "bad-payload", setup: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", setup: null });
    assert.deepEqual(runFeature(true), { decision: "deny", reason: "bad-payload", setup: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", setup: null });
  });

  it("rejects unknown field", () => {
    assert.deepEqual(runFeature({ dependency: "none", credential: "none", extra: "none" }), { decision: "deny", reason: "unknown-field", setup: null });
    assert.deepEqual(runFeature({ install: "yes" }), { decision: "deny", reason: "unknown-field", setup: null });
  });

  it("rejects colon-slash-slash value", () => {
    assert.deepEqual(runFeature({ dependency: "https://example.com", credential: "none" }), { decision: "deny", reason: "bad-value", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: "https://example.com" }), { decision: "deny", reason: "bad-value", setup: null });
  });

  it("rejects backslash value", () => {
    assert.deepEqual(runFeature({ dependency: "a\\b", credential: "none" }), { decision: "deny", reason: "bad-value", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: "a\\b" }), { decision: "deny", reason: "bad-value", setup: null });
  });

  it("rejects dotdot value", () => {
    assert.deepEqual(runFeature({ dependency: "a..b", credential: "none" }), { decision: "deny", reason: "bad-value", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: ".." }), { decision: "deny", reason: "bad-value", setup: null });
  });

  it("rejects missing or non-string dependency", () => {
    assert.deepEqual(runFeature({ credential: "none" }), { decision: "deny", reason: "bad-dependency", setup: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-dependency", setup: null });
    assert.deepEqual(runFeature({ dependency: 42, credential: "none" }), { decision: "deny", reason: "bad-dependency", setup: null });
    assert.deepEqual(runFeature({ dependency: null, credential: "none" }), { decision: "deny", reason: "bad-dependency", setup: null });
  });

  it("rejects other dependency values", () => {
    assert.deepEqual(runFeature({ dependency: "install", credential: "none" }), { decision: "deny", reason: "unknown-dependency", setup: null });
    assert.deepEqual(runFeature({ dependency: "", credential: "none" }), { decision: "deny", reason: "unknown-dependency", setup: null });
    assert.deepEqual(runFeature({ dependency: "None", credential: "none" }), { decision: "deny", reason: "unknown-dependency", setup: null });
  });

  it("rejects missing or non-string credential", () => {
    assert.deepEqual(runFeature({ dependency: "none" }), { decision: "deny", reason: "bad-credential", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: 7 }), { decision: "deny", reason: "bad-credential", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: null }), { decision: "deny", reason: "bad-credential", setup: null });
  });

  it("rejects other credential values", () => {
    assert.deepEqual(runFeature({ dependency: "none", credential: "token" }), { decision: "deny", reason: "unknown-credential", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: "secret" }), { decision: "deny", reason: "unknown-credential", setup: null });
    assert.deepEqual(runFeature({ dependency: "none", credential: "" }), { decision: "deny", reason: "unknown-credential", setup: null });
  });

  it("preserves input", () => {
    const payload = { dependency: "none", credential: "none" };
    runFeature(payload);
    assert.deepEqual(payload, { dependency: "none", credential: "none" });
  });
});
