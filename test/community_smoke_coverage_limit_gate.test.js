import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/smoke_coverage_limit_gate.mjs";

describe("smoke coverage limit gate", () => {
  it("allows smoke plus limited", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "limited" }), { decision: "allow", reason: "ok-smoke", bound: { assurance: "smoke", extent: "limited" } });
  });
  it("denies exhaustive extent as overclaim", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "exhaustive" }), { decision: "deny", reason: "overclaim-extent", bound: null });
  });
  it("denies full extent as overclaim", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "full" }), { decision: "deny", reason: "overclaim-extent", bound: null });
  });
  it("denies complete extent as overclaim", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "complete" }), { decision: "deny", reason: "overclaim-extent", bound: null });
  });
  it("denies non-object payloads with bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", bound: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", bound: null });
    assert.deepEqual(runFeature("smoke"), { decision: "deny", reason: "bad-payload", bound: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", bound: null });
    assert.deepEqual(runFeature(true), { decision: "deny", reason: "bad-payload", bound: null });
  });
  it("denies array payload with bad-payload", () => {
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", bound: null });
    assert.deepEqual(runFeature([{ assurance: "smoke", extent: "limited" }]), { decision: "deny", reason: "bad-payload", bound: null });
  });
  it("denies unknown fields", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "limited", extra: "x" }), { decision: "deny", reason: "unknown-field", bound: null });
    assert.deepEqual(runFeature({ coverage: "smoke" }), { decision: "deny", reason: "unknown-field", bound: null });
  });
  it("denies colon-slash-slash values with bad-value", () => {
    assert.deepEqual(runFeature({ assurance: "smoke://x", extent: "limited" }), { decision: "deny", reason: "bad-value", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "https://example" }), { decision: "deny", reason: "bad-value", bound: null });
  });
  it("denies backslash values with bad-value", () => {
    assert.deepEqual(runFeature({ assurance: "smoke\\x", extent: "limited" }), { decision: "deny", reason: "bad-value", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "a\\b" }), { decision: "deny", reason: "bad-value", bound: null });
  });
  it("denies dotdot values with bad-value", () => {
    assert.deepEqual(runFeature({ assurance: "smoke..", extent: "limited" }), { decision: "deny", reason: "bad-value", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: ".." }), { decision: "deny", reason: "bad-value", bound: null });
  });
  it("denies missing or non-string assurance with bad-assurance", () => {
    assert.deepEqual(runFeature({ extent: "limited" }), { decision: "deny", reason: "bad-assurance", bound: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-assurance", bound: null });
    assert.deepEqual(runFeature({ assurance: 1, extent: "limited" }), { decision: "deny", reason: "bad-assurance", bound: null });
    assert.deepEqual(runFeature({ assurance: null, extent: "limited" }), { decision: "deny", reason: "bad-assurance", bound: null });
  });
  it("denies other assurance strings with unknown-assurance", () => {
    assert.deepEqual(runFeature({ assurance: "manual", extent: "limited" }), { decision: "deny", reason: "unknown-assurance", bound: null });
    assert.deepEqual(runFeature({ assurance: "full", extent: "limited" }), { decision: "deny", reason: "unknown-assurance", bound: null });
  });
  it("denies missing or non-string extent with bad-extent", () => {
    assert.deepEqual(runFeature({ assurance: "smoke" }), { decision: "deny", reason: "bad-extent", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: 2 }), { decision: "deny", reason: "bad-extent", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: null }), { decision: "deny", reason: "bad-extent", bound: null });
  });
  it("denies other extent strings with unknown-extent", () => {
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "partial" }), { decision: "deny", reason: "unknown-extent", bound: null });
    assert.deepEqual(runFeature({ assurance: "smoke", extent: "SMOKE" }), { decision: "deny", reason: "unknown-extent", bound: null });
  });
  it("preserves input and stays deterministic JSON", () => {
    const first = { assurance: "smoke", extent: "limited" };
    const firstCopy = { assurance: "smoke", extent: "limited" };
    const outOne = runFeature(first);
    const outTwo = runFeature(firstCopy);
    assert.deepEqual(first, { assurance: "smoke", extent: "limited" });
    assert.deepEqual(outOne, outTwo);
    assert.equal(JSON.stringify(outOne), JSON.stringify({ decision: "allow", reason: "ok-smoke", bound: { assurance: "smoke", extent: "limited" } }));
  });
  it("denied results carry null bound", () => {
    const denied = runFeature({ assurance: "smoke", extent: "exhaustive" });
    assert.equal(denied.bound, null);
    assert.equal(denied.decision, "deny");
  });
});
