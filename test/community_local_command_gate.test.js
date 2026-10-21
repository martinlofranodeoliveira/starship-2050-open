import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_command_gate.mjs";

describe("local command gate", () => {
  it("allows npm check", () => {
    assert.deepEqual(runFeature({ runner: "npm", script: "check" }), { decision: "allow", reason: "ok-command", command: { runner: "npm", script: "check" } });
  });
  it("allows npm test", () => {
    assert.deepEqual(runFeature({ runner: "npm", script: "test" }), { decision: "allow", reason: "ok-command", command: { runner: "npm", script: "test" } });
  });
  it("allows npm start", () => {
    assert.deepEqual(runFeature({ runner: "npm", script: "start" }), { decision: "allow", reason: "ok-command", command: { runner: "npm", script: "start" } });
  });
  it("is deterministic and preserves input", () => {
    const input = { runner: "npm", script: "check" };
    const before = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature(input);
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input, { runner: "npm", script: "check" });
  });
  it("denies non-object payloads as bad-payload", () => {
    assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", command: null });
    assert.deepEqual(runFeature(["npm"]), { decision: "deny", reason: "bad-payload", command: null });
    assert.deepEqual(runFeature("npm"), { decision: "deny", reason: "bad-payload", command: null });
    assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", command: null });
    assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", command: null });
  });
  it("denies extra keys as unknown-field", () => {
    assert.deepEqual(runFeature({ runner: "npm", script: "check", extra: "x" }), { decision: "deny", reason: "unknown-field", command: null });
    assert.deepEqual(runFeature({ foo: "bar" }), { decision: "deny", reason: "unknown-field", command: null });
  });
  it("denies colon-slash-slash backslash dotdot as bad-value", () => {
    assert.deepEqual(runFeature({ runner: "https://example.com", script: "check" }), { decision: "deny", reason: "bad-value", command: null });
    assert.deepEqual(runFeature({ runner: "npm", script: "a..b" }), { decision: "deny", reason: "bad-value", command: null });
    assert.deepEqual(runFeature({ runner: "a\\b", script: "check" }), { decision: "deny", reason: "bad-value", command: null });
  });
  it("denies missing or non-string runner as bad-runner", () => {
    assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-runner", command: null });
    assert.deepEqual(runFeature({ script: "check" }), { decision: "deny", reason: "bad-runner", command: null });
    assert.deepEqual(runFeature({ runner: 7, script: "check" }), { decision: "deny", reason: "bad-runner", command: null });
  });
  it("denies other runner strings as unknown-runner", () => {
    assert.deepEqual(runFeature({ runner: "yarn", script: "check" }), { decision: "deny", reason: "unknown-runner", command: null });
    assert.deepEqual(runFeature({ runner: "npx", script: "test" }), { decision: "deny", reason: "unknown-runner", command: null });
  });
  it("denies missing or non-string script as bad-script", () => {
    assert.deepEqual(runFeature({ runner: "npm" }), { decision: "deny", reason: "bad-script", command: null });
    assert.deepEqual(runFeature({ runner: "npm", script: 9 }), { decision: "deny", reason: "bad-script", command: null });
  });
  it("denies other script strings as unknown-script", () => {
    assert.deepEqual(runFeature({ runner: "npm", script: "deploy" }), { decision: "deny", reason: "unknown-script", command: null });
    assert.deepEqual(runFeature({ runner: "npm", script: "install" }), { decision: "deny", reason: "unknown-script", command: null });
  });
});
