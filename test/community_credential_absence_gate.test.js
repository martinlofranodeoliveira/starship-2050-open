import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/credential_absence_gate.mjs";

describe("credential absence gate", () => {
  it("allows credential none with handling absent", () => {
    assert.deepEqual(runFeature({ credential: "none", handling: "absent" }), {
      decision: "allow",
      reason: "ok-absent",
      absence: { credential: "none", handling: "absent" }
    });
  });

  it("denies bad-payload for null, array and primitives", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", absence: null });
    assert.deepEqual(runFeature([1, 2]), { decision: "deny", reason: "bad-payload", absence: null });
    assert.deepEqual(runFeature("none"), { decision: "deny", reason: "bad-payload", absence: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", absence: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", absence: null });
  });

  it("denies bad-credential when missing or non-string", () => {
    assert.deepEqual(runFeature({ handling: "absent" }), { decision: "deny", reason: "bad-credential", absence: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-credential", absence: null });
    assert.deepEqual(runFeature({ credential: 123, handling: "absent" }), { decision: "deny", reason: "bad-credential", absence: null });
    assert.deepEqual(runFeature({ credential: null, handling: "absent" }), { decision: "deny", reason: "bad-credential", absence: null });
  });

  it("denies unknown-credential for token and password", () => {
    assert.deepEqual(runFeature({ credential: "token", handling: "absent" }), { decision: "deny", reason: "unknown-credential", absence: null });
    assert.deepEqual(runFeature({ credential: "password", handling: "absent" }), { decision: "deny", reason: "unknown-credential", absence: null });
  });

  it("denies bad-handling when missing or non-string", () => {
    assert.deepEqual(runFeature({ credential: "none" }), { decision: "deny", reason: "bad-handling", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: 7 }), { decision: "deny", reason: "bad-handling", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: null }), { decision: "deny", reason: "bad-handling", absence: null });
  });

  it("denies unknown-handling for required and local", () => {
    assert.deepEqual(runFeature({ credential: "none", handling: "required" }), { decision: "deny", reason: "unknown-handling", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: "local" }), { decision: "deny", reason: "unknown-handling", absence: null });
  });

  it("denies unknown-field for extra keys", () => {
    assert.deepEqual(runFeature({ credential: "none", handling: "absent", extra: "x" }), { decision: "deny", reason: "unknown-field", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: "absent", token: "abc" }), { decision: "deny", reason: "unknown-field", absence: null });
  });

  it("denies bad-value for colon-slash-slash, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ credential: "https://example", handling: "absent" }), { decision: "deny", reason: "bad-value", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: "a\\b" }), { decision: "deny", reason: "bad-value", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: "a..b" }), { decision: "deny", reason: "bad-value", absence: null });
    assert.deepEqual(runFeature({ credential: "none", handling: "absent", extra: "x://y" }), { decision: "deny", reason: "unknown-field", absence: null });
  });

  it("preserves input without mutation and stays deterministic pure JSON", () => {
    const input = { credential: "none", handling: "absent" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ credential: "none", handling: "absent" });
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(first), JSON.stringify(JSON.parse(JSON.stringify(first))));
    assert.equal(Object.keys(first).sort().join(","), "absence,decision,reason");
  });

  it("does not use clock identifiers", () => {
    const text = runFeature.toString();
    assert.equal(text.includes("Date"), false);
  });
});
