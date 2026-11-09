import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runFeature } from "../js/community/git_push_hygiene_gate.mjs";

describe("git push hygiene gate", () => {
  it("allows code on git", () => {
    const out = runFeature({ harbor: "git", item: "code" });
    assert.equal(out.decision, "allow");
    assert.equal(out.reason, "ok-push");
    assert.deepEqual(out.posting, { item: "code", harbor: "git" });
  });
  it("allows synthetic on git", () => {
    const out = runFeature({ harbor: "git", item: "synthetic" });
    assert.equal(out.decision, "allow");
    assert.equal(out.reason, "ok-push");
    assert.deepEqual(out.posting, { item: "synthetic", harbor: "git" });
  });
  it("allows docs on git", () => {
    const out = runFeature({ harbor: "git", item: "docs" });
    assert.equal(out.decision, "allow");
    assert.equal(out.reason, "ok-push");
    assert.deepEqual(out.posting, { item: "docs", harbor: "git" });
  });
  it("denies env-file", () => {
    const out = runFeature({ harbor: "git", item: "env-file" });
    assert.deepEqual(out, { decision: "deny", reason: "denied-item", posting: null });
  });
  it("denies personal-data", () => {
    const out = runFeature({ harbor: "git", item: "personal-data" });
    assert.deepEqual(out, { decision: "deny", reason: "denied-item", posting: null });
  });
  it("denies other private items", () => {
    for (const item of ["secret-key", "database", "upload"]) {
      assert.deepEqual(runFeature({ harbor: "git", item }), { decision: "deny", reason: "denied-item", posting: null });
    }
  });
  it("maps unknown harbor, field, payload and value", () => {
    assert.deepEqual(runFeature({ harbor: "cloud", item: "code" }), { decision: "deny", reason: "unknown-harbor", posting: null });
    assert.deepEqual(runFeature({ harbor: "git", item: "code", extra: "x" }), { decision: "deny", reason: "unknown-field", posting: null });
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", posting: null });
    assert.deepEqual(runFeature(["x"]), { decision: "deny", reason: "bad-payload", posting: null });
    assert.deepEqual(runFeature("code"), { decision: "deny", reason: "bad-payload", posting: null });
    assert.deepEqual(runFeature({ harbor: "git", item: "https://example.com" }), { decision: "deny", reason: "bad-value", posting: null });
    assert.deepEqual(runFeature({ harbor: "git", item: "a..b" }), { decision: "deny", reason: "bad-value", posting: null });
    assert.deepEqual(runFeature({ harbor: "git", item: "a\\b" }), { decision: "deny", reason: "bad-value", posting: null });
  });
  it("handles missing and unknown descriptors", () => {
    assert.deepEqual(runFeature({ item: "code" }), { decision: "deny", reason: "bad-harbor", posting: null });
    assert.deepEqual(runFeature({ harbor: "git" }), { decision: "deny", reason: "bad-item", posting: null });
    assert.deepEqual(runFeature({ harbor: "git", item: "mystery" }), { decision: "deny", reason: "unknown-item", posting: null });
  });
  it("is deterministic and preserves input", () => {
    const payload = { harbor: "git", item: "code" };
    const first = runFeature(payload);
    const second = runFeature({ harbor: "git", item: "code" });
    assert.deepEqual(first, second);
    assert.deepEqual(payload, { harbor: "git", item: "code" });
  });
  it("keeps pure source shape", () => {
    const src = readFileSync("js/community/git_push_hygiene_gate.mjs", "utf8");
    assert.ok(src.includes("Object.entries"));
    assert.ok(src.includes("new Map"));
    assert.ok(src.includes(".get("));
    assert.ok(src.includes(".set("));
    assert.ok(src.includes(".push("));
    assert.ok(src.includes("for"));
    assert.ok(src.includes("of"));
    assert.ok(!src.includes("import "));
    assert.ok(!src.includes("Date"));
    assert.ok(!src.includes("process."));
    assert.ok(!src.includes("console."));
    assert.ok(!src.includes("Math.random"));
    assert.equal(typeof runFeature, "function");
  });
});
