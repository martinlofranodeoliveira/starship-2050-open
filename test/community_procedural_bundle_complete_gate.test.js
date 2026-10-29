import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/procedural_bundle_complete_gate.mjs";

describe("procedural bundle complete gate", () => {
  it("accepts canvas then sound preserving order", () => {
    const input = { bundle: ["canvas-procedural", "sound-generated"] };
    const before = JSON.stringify(input);
    const result = runFeature(input);
    assert.deepEqual(result, {
      decision: "allow",
      reason: "ok-complete",
      complete: { bundle: ["canvas-procedural", "sound-generated"] }
    });
    assert.equal(JSON.stringify(input), before);
  });

  it("accepts sound then canvas preserving order", () => {
    const input = { bundle: ["sound-generated", "canvas-procedural"] };
    const result = runFeature(input);
    assert.equal(result.decision, "allow");
    assert.equal(result.reason, "ok-complete");
    assert.deepEqual(result.complete, { bundle: ["sound-generated", "canvas-procedural"] });
  });

  it("returns fresh bundle copy not same reference", () => {
    const input = { bundle: ["canvas-procedural", "sound-generated"] };
    const result = runFeature(input);
    assert.notEqual(result.complete.bundle, input.bundle);
    assert.deepEqual(result.complete.bundle, input.bundle);
  });

  it("is deterministic across calls", () => {
    const a = runFeature({ bundle: ["canvas-procedural", "sound-generated"] });
    const b = runFeature({ bundle: ["canvas-procedural", "sound-generated"] });
    assert.deepEqual(a, b);
    assert.notEqual(a.complete.bundle, b.complete.bundle);
  });

  it("denies single canvas item as incomplete", () => {
    assert.deepEqual(runFeature({ bundle: ["canvas-procedural"] }), {
      decision: "deny",
      reason: "incomplete-bundle",
      complete: null
    });
  });

  it("denies single sound item as incomplete", () => {
    assert.deepEqual(runFeature({ bundle: ["sound-generated"] }), {
      decision: "deny",
      reason: "incomplete-bundle",
      complete: null
    });
  });

  it("denies duplicated canvas entries", () => {
    assert.deepEqual(runFeature({ bundle: ["canvas-procedural", "canvas-procedural"] }), {
      decision: "deny",
      reason: "duplicate-render",
      complete: null
    });
  });

  it("denies duplicated sound entries", () => {
    assert.deepEqual(runFeature({ bundle: ["sound-generated", "sound-generated"] }), {
      decision: "deny",
      reason: "duplicate-render",
      complete: null
    });
  });

  it("denies unknown render strings", () => {
    const r1 = runFeature({ bundle: ["canvas-procedural", "photo-real"] });
    assert.equal(r1.decision, "deny");
    assert.equal(r1.reason, "unknown-render");
    assert.equal(r1.complete, null);
    const r2 = runFeature({ bundle: ["canvas-procedural", "3d-model"] });
    assert.equal(r2.reason, "unknown-render");
    const r3 = runFeature({ bundle: ["canvas-procedural", "voice-recorded"] });
    assert.equal(r3.reason, "unknown-render");
    const r4 = runFeature({ bundle: ["canvas-procedural", "marketing-clip"] });
    assert.equal(r4.reason, "unknown-render");
  });

  it("denies empty string render as unknown", () => {
    const r = runFeature({ bundle: ["canvas-procedural", ""] });
    assert.equal(r.decision, "deny");
    assert.equal(r.reason, "unknown-render");
    assert.equal(r.complete, null);
  });

  it("denies bad payload values", () => {
    for (const bad of [null, ["canvas-procedural"], "bundle", 42, true, undefined]) {
      const r = runFeature(bad);
      assert.equal(r.decision, "deny");
      assert.equal(r.reason, "bad-payload");
      assert.equal(r.complete, null);
    }
  });

  it("denies unknown field", () => {
    const r1 = runFeature({ bundle: ["canvas-procedural", "sound-generated"], extra: 1 });
    assert.equal(r1.decision, "deny");
    assert.equal(r1.reason, "unknown-field");
    assert.equal(r1.complete, null);
    const r2 = runFeature({ other: [] });
    assert.equal(r2.reason, "unknown-field");
  });

  it("denies missing bundle as bad-bundle", () => {
    const r = runFeature({});
    assert.deepEqual(r, { decision: "deny", reason: "bad-bundle", complete: null });
  });

  it("denies non-array bundle as bad-bundle", () => {
    const r = runFeature({ bundle: "canvas-procedural" });
    assert.equal(r.reason, "bad-bundle");
    assert.equal(r.complete, null);
  });

  it("denies empty bundle as bad-bundle", () => {
    const r = runFeature({ bundle: [] });
    assert.equal(r.reason, "bad-bundle");
    assert.equal(r.complete, null);
  });

  it("denies oversized bundle as bad-bundle", () => {
    const r = runFeature({ bundle: ["canvas-procedural", "sound-generated", "canvas-procedural"] });
    assert.equal(r.reason, "bad-bundle");
    assert.equal(r.complete, null);
  });

  it("denies non-string element as bad-bundle", () => {
    const r1 = runFeature({ bundle: ["canvas-procedural", 7] });
    assert.equal(r1.reason, "bad-bundle");
    const r2 = runFeature({ bundle: [null, "sound-generated"] });
    assert.equal(r2.reason, "bad-bundle");
  });

  it("denies colon-slash-slash value as bad-value", () => {
    const r = runFeature({ bundle: ["canvas-procedural", "https://example"] });
    assert.equal(r.decision, "deny");
    assert.equal(r.reason, "bad-value");
    assert.equal(r.complete, null);
  });

  it("denies backslash value as bad-value", () => {
    const r = runFeature({ bundle: ["canvas-procedural", "a\\b"] });
    assert.equal(r.reason, "bad-value");
    assert.equal(r.complete, null);
  });

  it("denies dotdot value as bad-value", () => {
    const r = runFeature({ bundle: ["canvas-procedural", "a..b"] });
    assert.equal(r.reason, "bad-value");
    assert.equal(r.complete, null);
  });

  it("preserves input without mutation", () => {
    const input = { bundle: ["sound-generated", "canvas-procedural"] };
    const before = JSON.stringify(input);
    const innerBefore = JSON.stringify(input.bundle);
    runFeature(input);
    runFeature(input);
    assert.equal(JSON.stringify(input), before);
    assert.equal(JSON.stringify(input.bundle), innerBefore);
  });

  it("output JSON fits safe domain", () => {
    const result = runFeature({ bundle: ["canvas-procedural", "sound-generated"] });
    const text = JSON.stringify(result);
    assert.ok(text.length < 64 * 1024);
    assert.ok(!text.includes("\u0000"));
    for (const ch of text) {
      const code = ch.codePointAt(0);
      assert.ok(code >= 32 || code === 10 || code === 13 || code === 9);
    }
  });
});
