import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/procedural_asset_gate.mjs";

describe("procedural asset gate", () => {
  it("accepts canvas plus procedural", () => {
    const out = runFeature({ asset: "canvas", source: "procedural" });
    assert.deepEqual(out, { decision: "allow", reason: "ok-procedural", render: { asset: "canvas", source: "procedural" } });
  });
  it("accepts sound plus generated", () => {
    const out = runFeature({ asset: "sound", source: "generated" });
    assert.deepEqual(out, { decision: "allow", reason: "ok-procedural", render: { asset: "sound", source: "generated" } });
  });
  it("rejects canvas plus generated as mismatch", () => {
    const out = runFeature({ asset: "canvas", source: "generated" });
    assert.deepEqual(out, { decision: "deny", reason: "mismatch-source", render: null });
  });
  it("rejects sound plus procedural as mismatch", () => {
    const out = runFeature({ asset: "sound", source: "procedural" });
    assert.deepEqual(out, { decision: "deny", reason: "mismatch-source", render: null });
  });
  it("rejects excluded image asset", () => {
    const out = runFeature({ asset: "image", source: "procedural" });
    assert.deepEqual(out, { decision: "deny", reason: "unknown-asset", render: null });
  });
  it("rejects non-object payloads", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", render: null });
    assert.deepEqual(runFeature([1, 2]), { decision: "deny", reason: "bad-payload", render: null });
    assert.deepEqual(runFeature("canvas"), { decision: "deny", reason: "bad-payload", render: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", render: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", render: null });
  });
  it("rejects unknown fields", () => {
    assert.deepEqual(runFeature({ asset: "canvas", source: "procedural", extra: "no" }), { decision: "deny", reason: "unknown-field", render: null });
    assert.deepEqual(runFeature({ asset: "canvas", mode: "x" }), { decision: "deny", reason: "unknown-field", render: null });
  });
  it("rejects bad values with url, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ asset: "http://x", source: "procedural" }), { decision: "deny", reason: "bad-value", render: null });
    assert.deepEqual(runFeature({ asset: "canvas", source: "a://b" }), { decision: "deny", reason: "bad-value", render: null });
    assert.deepEqual(runFeature({ asset: "a\\b", source: "procedural" }), { decision: "deny", reason: "bad-value", render: null });
    assert.deepEqual(runFeature({ asset: "canvas", source: "a..b" }), { decision: "deny", reason: "bad-value", render: null });
  });
  it("rejects missing or invalid asset and source", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-asset", render: null });
    assert.deepEqual(runFeature({ source: "procedural" }), { decision: "deny", reason: "bad-asset", render: null });
    assert.deepEqual(runFeature({ asset: 7, source: "procedural" }), { decision: "deny", reason: "bad-asset", render: null });
    assert.deepEqual(runFeature({ asset: "canvas" }), { decision: "deny", reason: "bad-source", render: null });
    assert.deepEqual(runFeature({ asset: "canvas", source: 7 }), { decision: "deny", reason: "bad-source", render: null });
    assert.deepEqual(runFeature({ asset: "canvas", source: "raw" }), { decision: "deny", reason: "unknown-source", render: null });
  });
  it("is deterministic and preserves input", () => {
    const first = { asset: "canvas", source: "procedural" };
    const before = JSON.stringify(first);
    const a = runFeature(first);
    const b = runFeature({ asset: "canvas", source: "procedural" });
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(first), before);
    const bad = { asset: "canvas", source: "generated" };
    const badBefore = JSON.stringify(bad);
    const c = runFeature(bad);
    const d = runFeature({ asset: "canvas", source: "generated" });
    assert.deepEqual(c, d);
    assert.deepEqual(c, { decision: "deny", reason: "mismatch-source", render: null });
    assert.equal(JSON.stringify(bad), badBefore);
  });
});
