import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/contribution_value_preference_gate.mjs";

describe("contribution value preference gate", () => {
  it("allows useful change with contribution motive", () => {
    assert.deepEqual(runFeature({ change: "useful", motive: "contribution" }), {
      decision: "allow",
      preference: { change: "useful", motive: "contribution" },
      reason: "ok-preferred"
    });
  });
  it("allows complete change with contribution motive", () => {
    assert.deepEqual(runFeature({ change: "complete", motive: "contribution" }), {
      decision: "allow",
      preference: { change: "complete", motive: "contribution" },
      reason: "ok-preferred"
    });
  });
  it("denies useful change with activity motive", () => {
    assert.deepEqual(runFeature({ change: "useful", motive: "activity" }), {
      decision: "deny",
      preference: null,
      reason: "denied-activity"
    });
  });
  it("denies complete change with activity motive", () => {
    assert.deepEqual(runFeature({ change: "complete", motive: "activity" }), {
      decision: "deny",
      preference: null,
      reason: "denied-activity"
    });
  });
  it("denies non-object and array payloads with bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", preference: null, reason: "bad-payload" });
    assert.deepEqual(runFeature("useful"), { decision: "deny", preference: null, reason: "bad-payload" });
    assert.deepEqual(runFeature(42), { decision: "deny", preference: null, reason: "bad-payload" });
    assert.deepEqual(runFeature(undefined), { decision: "deny", preference: null, reason: "bad-payload" });
    assert.deepEqual(runFeature([]), { decision: "deny", preference: null, reason: "bad-payload" });
    assert.deepEqual(runFeature([{ change: "useful", motive: "contribution" }]), { decision: "deny", preference: null, reason: "bad-payload" });
  });
  it("denies unknown field", () => {
    assert.deepEqual(runFeature({ change: "useful", motive: "contribution", extra: "x" }), {
      decision: "deny",
      preference: null,
      reason: "unknown-field"
    });
  });
  it("denies colon-slash-slash injection with bad-value", () => {
    assert.deepEqual(runFeature({ change: "useful", motive: "https://example" }), {
      decision: "deny",
      preference: null,
      reason: "bad-value"
    });
  });
  it("denies backslash injection with bad-value", () => {
    assert.deepEqual(runFeature({ change: "useful\\x", motive: "contribution" }), {
      decision: "deny",
      preference: null,
      reason: "bad-value"
    });
  });
  it("denies dotdot injection with bad-value", () => {
    assert.deepEqual(runFeature({ change: "..", motive: "contribution" }), {
      decision: "deny",
      preference: null,
      reason: "bad-value"
    });
  });
  it("denies missing or non-string change with bad-change", () => {
    assert.deepEqual(runFeature({ motive: "contribution" }), { decision: "deny", preference: null, reason: "bad-change" });
    assert.deepEqual(runFeature({ change: 7, motive: "contribution" }), { decision: "deny", preference: null, reason: "bad-change" });
    assert.deepEqual(runFeature({}), { decision: "deny", preference: null, reason: "bad-change" });
  });
  it("denies unknown change", () => {
    assert.deepEqual(runFeature({ change: "quick", motive: "contribution" }), {
      decision: "deny",
      preference: null,
      reason: "unknown-change"
    });
  });
  it("denies missing or non-string motive with bad-motive", () => {
    assert.deepEqual(runFeature({ change: "useful" }), { decision: "deny", preference: null, reason: "bad-motive" });
    assert.deepEqual(runFeature({ change: "useful", motive: 9 }), { decision: "deny", preference: null, reason: "bad-motive" });
  });
  it("denies unknown motive", () => {
    assert.deepEqual(runFeature({ change: "useful", motive: "fame" }), {
      decision: "deny",
      preference: null,
      reason: "unknown-motive"
    });
  });
  it("preserves input", () => {
    const payload = { change: "useful", motive: "contribution" };
    const snapshot = JSON.stringify(payload);
    const out = runFeature(payload);
    assert.equal(JSON.stringify(payload), snapshot);
    assert.deepEqual(out.preference, { change: "useful", motive: "contribution" });
    const denied = { change: "useful", motive: "activity" };
    const deniedSnapshot = JSON.stringify(denied);
    runFeature(denied);
    assert.equal(JSON.stringify(denied), deniedSnapshot);
  });
  it("is deterministic pure JSON", () => {
    const first = runFeature({ change: "complete", motive: "contribution" });
    const second = runFeature({ change: "complete", motive: "contribution" });
    assert.deepEqual(first, second);
    assert.equal(JSON.parse(JSON.stringify(first)).reason, "ok-preferred");
    const deniedFirst = runFeature({ change: "useful", motive: "activity" });
    const deniedSecond = runFeature({ change: "useful", motive: "activity" });
    assert.deepEqual(deniedFirst, deniedSecond);
  });
});
