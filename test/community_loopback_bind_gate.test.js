import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/loopback_bind_gate.mjs";

describe("loopback bind gate", () => {
  it("allows exact loopback descriptor", () => {
    assert.deepEqual(runFeature({ host: "127.0.0.1", port: 8080 }), {
      decision: "allow",
      reason: "ok-loopback",
      binding: { host: "127.0.0.1", port: 8080 }
    });
  });

  it("denies bad-payload for null, array and non-objects", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", binding: null });
    assert.deepEqual(runFeature(["127.0.0.1"]), { decision: "deny", reason: "bad-payload", binding: null });
    assert.deepEqual(runFeature("127.0.0.1"), { decision: "deny", reason: "bad-payload", binding: null });
    assert.deepEqual(runFeature(8080), { decision: "deny", reason: "bad-payload", binding: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", binding: null });
  });

  it("denies unknown-field for extra keys", () => {
    assert.deepEqual(runFeature({ host: "127.0.0.1", port: 8080, path: "/" }), {
      decision: "deny",
      reason: "unknown-field",
      binding: null
    });
    assert.deepEqual(runFeature({ host: "127.0.0.1", protocol: "http" }), {
      decision: "deny",
      reason: "unknown-field",
      binding: null
    });
  });

  it("denies bad-value for colon-slash-slash, backslash and dotdot", () => {
    assert.deepEqual(runFeature({ host: "http://127.0.0.1", port: 8080 }), {
      decision: "deny",
      reason: "bad-value",
      binding: null
    });
    assert.deepEqual(runFeature({ host: "127.0.0.1\\x", port: 8080 }), {
      decision: "deny",
      reason: "bad-value",
      binding: null
    });
    assert.deepEqual(runFeature({ host: "127.0.0.1..", port: 8080 }), {
      decision: "deny",
      reason: "bad-value",
      binding: null
    });
  });

  it("denies bad-host or unknown-host unless exact string", () => {
    assert.deepEqual(runFeature({ port: 8080 }), { decision: "deny", reason: "bad-host", binding: null });
    assert.deepEqual(runFeature({ host: 123, port: 8080 }), { decision: "deny", reason: "bad-host", binding: null });
    assert.deepEqual(runFeature({ host: "0.0.0.0", port: 8080 }), { decision: "deny", reason: "unknown-host", binding: null });
    assert.deepEqual(runFeature({ host: "localhost", port: 8080 }), { decision: "deny", reason: "unknown-host", binding: null });
  });

  it("denies bad-port or unknown-port unless exact number 8080", () => {
    assert.deepEqual(runFeature({ host: "127.0.0.1" }), { decision: "deny", reason: "bad-port", binding: null });
    assert.deepEqual(runFeature({ host: "127.0.0.1", port: "8080" }), { decision: "deny", reason: "bad-port", binding: null });
    assert.deepEqual(runFeature({ host: "127.0.0.1", port: 3000 }), { decision: "deny", reason: "unknown-port", binding: null });
    assert.deepEqual(runFeature({ host: "127.0.0.1", port: 8081 }), { decision: "deny", reason: "unknown-port", binding: null });
  });

  it("is pure deterministic JSON and preserves input", () => {
    const first = runFeature({ host: "127.0.0.1", port: 8080 });
    const second = runFeature({ host: "127.0.0.1", port: 8080 });
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    const input = { host: "127.0.0.1", port: 8080 };
    const snapshot = JSON.stringify(input);
    runFeature(input);
    assert.equal(JSON.stringify(input), snapshot);
    const denied = runFeature({ host: "0.0.0.0", port: 8080 });
    assert.equal(denied.binding, null);
    assert.equal(typeof denied.decision, "string");
    assert.equal(typeof denied.reason, "string");
  });
});
