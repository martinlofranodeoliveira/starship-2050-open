import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_port_gate.mjs";

describe("local port gate", () => {
  it("accepts serve with 8080", () => {
    assert.deepEqual(runFeature({ service: "serve", port: 8080 }), { decision: "allow", reason: "ok-open", endpoint: { service: "serve", port: 8080 } });
    assert.deepEqual(runFeature({ port: 8080, service: "serve" }), { decision: "allow", reason: "ok-open", endpoint: { service: "serve", port: 8080 } });
  });
  it("denies missing or non-string service", () => {
    assert.deepEqual(runFeature({ port: 8080 }), { decision: "deny", reason: "bad-service", endpoint: null });
    assert.deepEqual(runFeature({ port: 8080, service: 123 }), { decision: "deny", reason: "bad-service", endpoint: null });
    assert.deepEqual(runFeature({ port: 8080, service: null }), { decision: "deny", reason: "bad-service", endpoint: null });
    assert.deepEqual(runFeature({ port: 8080, service: 8080 }), { decision: "deny", reason: "bad-service", endpoint: null });
  });
  it("denies disallowed string service", () => {
    assert.deepEqual(runFeature({ service: "cloud", port: 8080 }), { decision: "deny", reason: "unknown-service", endpoint: null });
    assert.deepEqual(runFeature({ service: "Serve", port: 8080 }), { decision: "deny", reason: "unknown-service", endpoint: null });
    assert.deepEqual(runFeature({ service: "", port: 8080 }), { decision: "deny", reason: "unknown-service", endpoint: null });
  });
  it("denies bad ports and flags other safe integers", () => {
    assert.deepEqual(runFeature({ service: "serve" }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: "8080" }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: null }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 80.5 }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: NaN }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: Infinity }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 9007199254740991 + 2 }), { decision: "deny", reason: "bad-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 3000 }), { decision: "deny", reason: "unknown-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 8081 }), { decision: "deny", reason: "unknown-port", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 0 }), { decision: "deny", reason: "unknown-port", endpoint: null });
  });
  it("denies non-objects, unknown fields and bad values and preserves input", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", endpoint: null });
    assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", endpoint: null });
    assert.deepEqual(runFeature("serve"), { decision: "deny", reason: "bad-payload", endpoint: null });
    assert.deepEqual(runFeature(8080), { decision: "deny", reason: "bad-payload", endpoint: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", endpoint: null });
    assert.deepEqual(runFeature({ service: "serve", port: 8080, extra: 1 }), { decision: "deny", reason: "unknown-field", endpoint: null });
    assert.deepEqual(runFeature({ service: "http://evil", port: 8080 }), { decision: "deny", reason: "bad-value", endpoint: null });
    assert.deepEqual(runFeature({ service: "a\\b", port: 8080 }), { decision: "deny", reason: "bad-value", endpoint: null });
    assert.deepEqual(runFeature({ service: "a..b", port: 8080 }), { decision: "deny", reason: "bad-value", endpoint: null });
    const input = { service: "serve", port: 8080 };
    const snapshot = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ service: "serve", port: 8080 });
    assert.equal(JSON.stringify(input), snapshot);
    assert.deepEqual(first, second);
  });
});
