import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/code_evidence_bundle_gate.mjs";

describe("code evidence bundle gate", () => {
  it("allows valid bundle in any key order", () => {
    const input = { docs: "updated", kind: "code", repro: "steps", tests: "relevant" };
    assert.deepEqual(runFeature(input), {
      decision: "allow",
      reason: "ok-code-bundle",
      evidence: { kind: "code", tests: "relevant", repro: "steps", docs: "updated" }
    });
  });
  it("denies bad-payload for null, array and primitives", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", evidence: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", evidence: null });
    assert.deepEqual(runFeature("code"), { decision: "deny", reason: "bad-payload", evidence: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", evidence: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", evidence: null });
  });
  it("denies unknown-field for extra keys", () => {
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "steps", docs: "updated", extra: "x" }), { decision: "deny", reason: "unknown-field", evidence: null });
  });
  it("denies bad-value for colon-slash-slash, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ kind: "code", tests: "https://example", repro: "steps", docs: "updated" }), { decision: "deny", reason: "bad-value", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "a\\b", docs: "updated" }), { decision: "deny", reason: "bad-value", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "steps", docs: "a..b" }), { decision: "deny", reason: "bad-value", evidence: null });
  });
  it("denies bad-kind and unknown-kind", () => {
    assert.deepEqual(runFeature({ tests: "relevant", repro: "steps", docs: "updated" }), { decision: "deny", reason: "bad-kind", evidence: null });
    assert.deepEqual(runFeature({ kind: 7, tests: "relevant", repro: "steps", docs: "updated" }), { decision: "deny", reason: "bad-kind", evidence: null });
    assert.deepEqual(runFeature({ kind: "issue", tests: "relevant", repro: "steps", docs: "updated" }), { decision: "deny", reason: "unknown-kind", evidence: null });
  });
  it("denies bad-tests and unknown-tests", () => {
    assert.deepEqual(runFeature({ kind: "code", repro: "steps", docs: "updated" }), { decision: "deny", reason: "bad-tests", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: 1, repro: "steps", docs: "updated" }), { decision: "deny", reason: "bad-tests", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "none", repro: "steps", docs: "updated" }), { decision: "deny", reason: "unknown-tests", evidence: null });
  });
  it("denies bad-repro and unknown-repro", () => {
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", docs: "updated" }), { decision: "deny", reason: "bad-repro", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: null, docs: "updated" }), { decision: "deny", reason: "bad-repro", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "missing", docs: "updated" }), { decision: "deny", reason: "unknown-repro", evidence: null });
  });
  it("denies bad-docs and unknown-docs", () => {
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "steps" }), { decision: "deny", reason: "bad-docs", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "steps", docs: false }), { decision: "deny", reason: "bad-docs", evidence: null });
    assert.deepEqual(runFeature({ kind: "code", tests: "relevant", repro: "steps", docs: "todo" }), { decision: "deny", reason: "unknown-docs", evidence: null });
  });
  it("preserves input and is deterministic", () => {
    const input = { kind: "code", tests: "relevant", repro: "steps", docs: "updated" };
    const snapshot = { kind: "code", tests: "relevant", repro: "steps", docs: "updated" };
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.deepEqual(input, snapshot);
  });
});
