import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/doc_review_boundary_gate.mjs";

describe("doc review boundary gate allows", () => {
  it("accepts manifests checked", () => {
    assert.deepEqual(runFeature({ area: "manifests", status: "checked" }), {
      decision: "allow",
      reason: "ok-review-boundary",
      review: { area: "manifests", status: "checked" }
    });
  });
  it("accepts guide checked", () => {
    assert.deepEqual(runFeature({ area: "guide", status: "checked" }), {
      decision: "allow",
      reason: "ok-review-boundary",
      review: { area: "guide", status: "checked" }
    });
  });
  it("accepts integrations not-exercised", () => {
    assert.deepEqual(runFeature({ area: "integrations", status: "not-exercised" }), {
      decision: "allow",
      reason: "ok-review-boundary",
      review: { area: "integrations", status: "not-exercised" }
    });
  });
  it("accepts platforms not-exercised", () => {
    assert.deepEqual(runFeature({ area: "platforms", status: "not-exercised" }), {
      decision: "allow",
      reason: "ok-review-boundary",
      review: { area: "platforms", status: "not-exercised" }
    });
  });
  it("accepts real-services not-exercised", () => {
    assert.deepEqual(runFeature({ area: "real-services", status: "not-exercised" }), {
      decision: "allow",
      reason: "ok-review-boundary",
      review: { area: "real-services", status: "not-exercised" }
    });
  });
});

describe("doc review boundary gate mismatch", () => {
  it("denies integrations checked", () => {
    assert.deepEqual(runFeature({ area: "integrations", status: "checked" }), {
      decision: "deny",
      reason: "mismatch-status",
      review: null
    });
  });
  it("denies platforms checked", () => {
    assert.deepEqual(runFeature({ area: "platforms", status: "checked" }), {
      decision: "deny",
      reason: "mismatch-status",
      review: null
    });
  });
  it("denies real-services checked", () => {
    assert.deepEqual(runFeature({ area: "real-services", status: "checked" }), {
      decision: "deny",
      reason: "mismatch-status",
      review: null
    });
  });
  it("denies manifests not-exercised", () => {
    assert.deepEqual(runFeature({ area: "manifests", status: "not-exercised" }), {
      decision: "deny",
      reason: "mismatch-status",
      review: null
    });
  });
  it("denies guide not-exercised", () => {
    assert.deepEqual(runFeature({ area: "guide", status: "not-exercised" }), {
      decision: "deny",
      reason: "mismatch-status",
      review: null
    });
  });
});

describe("doc review boundary gate malformed", () => {
  it("denies non-object payloads as bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", review: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", review: null });
    assert.deepEqual(runFeature("manifests"), { decision: "deny", reason: "bad-payload", review: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", review: null });
    assert.deepEqual(runFeature([{ area: "guide", status: "checked" }]), { decision: "deny", reason: "bad-payload", review: null });
  });
  it("denies unknown fields", () => {
    assert.deepEqual(runFeature({ area: "guide", status: "checked", extra: "x" }), {
      decision: "deny",
      reason: "unknown-field",
      review: null
    });
  });
  it("denies forbidden substrings as bad-value", () => {
    assert.deepEqual(runFeature({ area: "guide", status: "a://b" }), {
      decision: "deny",
      reason: "bad-value",
      review: null
    });
    assert.deepEqual(runFeature({ area: "a\\b", status: "checked" }), {
      decision: "deny",
      reason: "bad-value",
      review: null
    });
    assert.deepEqual(runFeature({ area: "guide", status: "a..b" }), {
      decision: "deny",
      reason: "bad-value",
      review: null
    });
  });
  it("denies missing or non-string area and status", () => {
    assert.deepEqual(runFeature({ status: "checked" }), { decision: "deny", reason: "bad-area", review: null });
    assert.deepEqual(runFeature({ area: 7, status: "checked" }), { decision: "deny", reason: "bad-area", review: null });
    assert.deepEqual(runFeature({ area: "guide" }), { decision: "deny", reason: "bad-status", review: null });
    assert.deepEqual(runFeature({ area: "guide", status: 7 }), { decision: "deny", reason: "bad-status", review: null });
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-area", review: null });
  });
  it("denies wrong enums", () => {
    assert.deepEqual(runFeature({ area: "docs", status: "checked" }), {
      decision: "deny",
      reason: "unknown-area",
      review: null
    });
    assert.deepEqual(runFeature({ area: "guide", status: "done" }), {
      decision: "deny",
      reason: "unknown-status",
      review: null
    });
  });
});

describe("doc review boundary gate purity", () => {
  it("preserves input and is deterministic", () => {
    const payload = { area: "manifests", status: "checked" };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature({ area: "manifests", status: "checked" });
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(first, second);
    assert.notEqual(first, second);
    assert.notEqual(first.review, second.review);
  });
});
