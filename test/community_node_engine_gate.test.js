import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/node_engine_gate.mjs";

describe("node engine gate", () => {
  it("allows node 22", () => {
    assert.deepEqual(runFeature({ engine: "node", major: 22 }), {
      decision: "allow",
      reason: "ok-engine",
      runtime: { engine: "node", major: 22 }
    });
  });
  it("allows node 24", () => {
    assert.deepEqual(runFeature({ engine: "node", major: 24 }), {
      decision: "allow",
      reason: "ok-engine",
      runtime: { engine: "node", major: 24 }
    });
  });
  it("denies too-old for major 20", () => {
    assert.deepEqual(runFeature({ engine: "node", major: 20 }), {
      decision: "deny",
      reason: "too-old",
      runtime: null
    });
  });
  it("denies future versions", () => {
    assert.deepEqual(runFeature({ engine: "node", major: 49 }), {
      decision: "deny",
      reason: "future-version",
      runtime: null
    });
  });
  it("denies unknown engine and preserves input", () => {
    const payload = { engine: "deno", major: 22 };
    const before = JSON.stringify(payload);
    assert.deepEqual(runFeature(payload), { decision: "deny", reason: "unknown-engine", runtime: null });
    assert.equal(JSON.stringify(payload), before);
  });
  it("denies missing or bad engine", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-engine", runtime: null });
    assert.deepEqual(runFeature({ major: 22 }), { decision: "deny", reason: "bad-engine", runtime: null });
    assert.deepEqual(runFeature({ engine: 22, major: 22 }), { decision: "deny", reason: "bad-engine", runtime: null });
  });
  it("denies unknown field and preserves input", () => {
    const payload = { engine: "node", major: 22, extra: 1 };
    const before = JSON.stringify(payload);
    assert.deepEqual(runFeature(payload), { decision: "deny", reason: "unknown-field", runtime: null });
    assert.equal(JSON.stringify(payload), before);
  });
  it("denies bad payload variants", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", runtime: null });
    assert.deepEqual(runFeature([{ engine: "node", major: 22 }]), { decision: "deny", reason: "bad-payload", runtime: null });
    assert.deepEqual(runFeature("node"), { decision: "deny", reason: "bad-payload", runtime: null });
  });
  it("denies bad major variants and preserves input", () => {
    const badValues = [
      { engine: "node" },
      { engine: "node", major: "22" },
      { engine: "node", major: 22.5 },
      { engine: "node", major: NaN },
      { engine: "node", major: Infinity },
      { engine: "node", major: 9007199254740992 }
    ];
    for (const payload of badValues) {
      const before = JSON.stringify(payload);
      assert.deepEqual(runFeature(payload), { decision: "deny", reason: "bad-major", runtime: null });
      assert.equal(JSON.stringify(payload), before);
    }
  });
  it("denies bad string values", () => {
    assert.deepEqual(runFeature({ engine: "node://x", major: 22 }), { decision: "deny", reason: "bad-value", runtime: null });
    assert.deepEqual(runFeature({ engine: "node\\x", major: 22 }), { decision: "deny", reason: "bad-value", runtime: null });
  });
  it("is deterministic and preserves successful input", () => {
    const payload = { engine: "node", major: 22 };
    const first = runFeature(payload);
    const second = runFeature(payload);
    assert.deepEqual(first, second);
    assert.deepEqual(payload, { engine: "node", major: 22 });
  });
});
