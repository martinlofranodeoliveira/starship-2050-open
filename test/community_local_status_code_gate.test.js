import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_status_code_gate.mjs";
import { readFileSync } from "node:fs";

describe("local status code gate", () => {
  it("accepts served plus static as 200", () => {
    assert.deepEqual(runFeature({ outcome: "served", detail: "static" }), { decision: "allow", reason: "ok-serve", status: 200 });
    assert.deepEqual(runFeature({ detail: "static", outcome: "served" }), { decision: "allow", reason: "ok-serve", status: 200 });
  });
  it("accepts missing variants as 404", () => {
    const details = ["dotfile", "traversal", "symlink", "escape", "private", "unknown"];
    for (const d of details) {
      assert.deepEqual(runFeature({ outcome: "missing", detail: d }), { decision: "allow", reason: "ok-missing", status: 404 });
    }
  });
  it("accepts rejected plus method as 405", () => {
    assert.deepEqual(runFeature({ outcome: "rejected", detail: "method" }), { decision: "allow", reason: "ok-rejected", status: 405 });
  });
  it("denies bad payload with null status", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", status: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", status: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", status: null });
    assert.deepEqual(runFeature([{ outcome: "served", detail: "static" }]), { decision: "deny", reason: "bad-payload", status: null });
    assert.deepEqual(runFeature("served"), { decision: "deny", reason: "bad-payload", status: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", status: null });
  });
  it("denies unknown fields", () => {
    assert.deepEqual(runFeature({ outcome: "served", detail: "static", extra: "x" }), { decision: "deny", reason: "unknown-field", status: null });
    assert.deepEqual(runFeature({ outcome: "served", path: "/" }), { decision: "deny", reason: "unknown-field", status: null });
  });
  it("denies bad values with :// backslash or dotdot", () => {
    assert.deepEqual(runFeature({ outcome: "served", detail: "static://x" }), { decision: "deny", reason: "bad-value", status: null });
    assert.deepEqual(runFeature({ outcome: "https://x", detail: "static" }), { decision: "deny", reason: "bad-value", status: null });
    assert.deepEqual(runFeature({ outcome: "served", detail: "a\\b" }), { decision: "deny", reason: "bad-value", status: null });
    assert.deepEqual(runFeature({ outcome: "served", detail: ".." }), { decision: "deny", reason: "bad-value", status: null });
    assert.deepEqual(runFeature({ outcome: "../x", detail: "static" }), { decision: "deny", reason: "bad-value", status: null });
  });
  it("denies bad and unknown outcome detail values", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-outcome", status: null });
    assert.deepEqual(runFeature({ detail: "static" }), { decision: "deny", reason: "bad-outcome", status: null });
    assert.deepEqual(runFeature({ outcome: 1, detail: "static" }), { decision: "deny", reason: "bad-outcome", status: null });
    assert.deepEqual(runFeature({ outcome: "done", detail: "static" }), { decision: "deny", reason: "unknown-outcome", status: null });
    assert.deepEqual(runFeature({ outcome: "served" }), { decision: "deny", reason: "bad-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "served", detail: 1 }), { decision: "deny", reason: "bad-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "served", detail: "weird" }), { decision: "deny", reason: "unknown-detail", status: null });
  });
  it("denies mismatched pairings", () => {
    assert.deepEqual(runFeature({ outcome: "served", detail: "dotfile" }), { decision: "deny", reason: "mismatch-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "missing", detail: "static" }), { decision: "deny", reason: "mismatch-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "missing", detail: "method" }), { decision: "deny", reason: "mismatch-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "rejected", detail: "static" }), { decision: "deny", reason: "mismatch-detail", status: null });
    assert.deepEqual(runFeature({ outcome: "rejected", detail: "unknown" }), { decision: "deny", reason: "mismatch-detail", status: null });
  });
  it("preserves input and stays deterministic pure JSON", () => {
    const payload = { outcome: "served", detail: "static" };
    const before = JSON.stringify(payload);
    const first = runFeature(payload);
    const second = runFeature({ outcome: "served", detail: "static" });
    assert.equal(JSON.stringify(payload), before);
    assert.deepEqual(payload, { outcome: "served", detail: "static" });
    assert.deepEqual(first, second);
    assert.deepEqual(Object.keys(first).sort(), ["decision", "reason", "status"]);
    assert.ok(first.decision === "allow" || first.decision === "deny");
    assert.ok(typeof first.reason === "string");
    assert.ok(first.status === null || typeof first.status === "number");
    assert.ok(!(first instanceof Promise));
  });
  it("uses only allowed constructs without Date or variable-index access", () => {
    const src = readFileSync(new URL("../js/community/local_status_code_gate.mjs", import.meta.url), "utf8");
    assert.ok(src.includes("for") && src.includes(" of "));
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes("new Map"));
    assert.ok(src.includes(".get("));
    assert.ok(src.includes(".set("));
    assert.ok(src.includes(".push("));
    assert.ok(!src.includes("Date"));
    const brackets = src.match(/\[[^\]]*\]/g) || [];
    for (const b of brackets) {
      assert.ok(b === "[]" || b === "[0]" || b === "[1]", "unexpected bracket " + b);
    }
  });
});
