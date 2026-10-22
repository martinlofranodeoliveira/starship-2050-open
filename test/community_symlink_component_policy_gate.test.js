import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/symlink_component_policy_gate.mjs";

describe("symlink component policy gate", () => {
  it("allows regular inside with mirrored policy", () => {
    assert.deepEqual(runFeature({ component: "regular", placement: "inside" }), {
      decision: "allow",
      reason: "ok-regular",
      policy: { component: "regular", placement: "inside" }
    });
  });
  it("denies symlink inside even though target is inside", () => {
    assert.deepEqual(runFeature({ component: "symlink", placement: "inside" }), {
      decision: "deny",
      reason: "symlink-denied",
      policy: null
    });
  });
  it("denies regular outside", () => {
    assert.deepEqual(runFeature({ component: "regular", placement: "outside" }), {
      decision: "deny",
      reason: "outside-root",
      policy: null
    });
  });
  it("denies symlink outside as outside-root", () => {
    assert.deepEqual(runFeature({ component: "symlink", placement: "outside" }), {
      decision: "deny",
      reason: "outside-root",
      policy: null
    });
  });
  it("rejects bad payloads", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature("regular"), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", policy: null });
    assert.deepEqual(runFeature([{ component: "regular", placement: "inside" }]), { decision: "deny", reason: "bad-payload", policy: null });
  });
  it("rejects unknown field", () => {
    assert.deepEqual(runFeature({ component: "regular", placement: "inside", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      policy: null
    });
  });
  it("rejects bad values with url backslash and dotdot", () => {
    assert.deepEqual(runFeature({ component: "https://x", placement: "inside" }), {
      decision: "deny",
      reason: "bad-value",
      policy: null
    });
    assert.deepEqual(runFeature({ component: "regular", placement: "a\\b" }), {
      decision: "deny",
      reason: "bad-value",
      policy: null
    });
    assert.deepEqual(runFeature({ component: "regular", placement: "a..b" }), {
      decision: "deny",
      reason: "bad-value",
      policy: null
    });
  });
  it("rejects missing or non-string component", () => {
    assert.deepEqual(runFeature({ placement: "inside" }), { decision: "deny", reason: "bad-component", policy: null });
    assert.deepEqual(runFeature({ component: 7, placement: "inside" }), { decision: "deny", reason: "bad-component", policy: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-component", policy: null });
  });
  it("rejects unknown component", () => {
    assert.deepEqual(runFeature({ component: "other", placement: "inside" }), {
      decision: "deny",
      reason: "unknown-component",
      policy: null
    });
  });
  it("rejects missing or non-string placement", () => {
    assert.deepEqual(runFeature({ component: "regular" }), { decision: "deny", reason: "bad-placement", policy: null });
    assert.deepEqual(runFeature({ component: "regular", placement: 9 }), { decision: "deny", reason: "bad-placement", policy: null });
  });
  it("rejects unknown placement", () => {
    assert.deepEqual(runFeature({ component: "regular", placement: "elsewhere" }), {
      decision: "deny",
      reason: "unknown-placement",
      policy: null
    });
  });
  it("preserves input and is deterministic", () => {
    const input = { component: "regular", placement: "inside" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ component: "regular", placement: "inside" });
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(first, second);
    assert.deepEqual(first, { decision: "allow", reason: "ok-regular", policy: { component: "regular", placement: "inside" } });
  });
});
