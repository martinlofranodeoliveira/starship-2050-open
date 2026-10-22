import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/local_open_url_gate.mjs";

describe("local open url gate", () => {
  test("accepts http with 127.0.0.1:8080", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:8080" }), {
      decision: "allow",
      reason: "ok-open",
      open: { scheme: "http", hostport: "127.0.0.1:8080" }
    });
  });
  test("accepts keys in reverse order", () => {
    assert.deepStrictEqual(runFeature({ hostport: "127.0.0.1:8080", scheme: "http" }), {
      decision: "allow",
      reason: "ok-open",
      open: { scheme: "http", hostport: "127.0.0.1:8080" }
    });
  });
  test("denies non-http scheme and preserves input", () => {
    const payload = { scheme: "https", hostport: "127.0.0.1:8080" };
    const before = JSON.stringify(payload);
    assert.deepStrictEqual(runFeature(payload), { decision: "deny", reason: "unknown-scheme", open: null });
    assert.strictEqual(JSON.stringify(payload), before);
  });
  test("denies other unknown schemes", () => {
    for (const scheme of ["ftp", "file", "HTTP", "", "ws"]) {
      assert.deepStrictEqual(runFeature({ scheme, hostport: "127.0.0.1:8080" }), {
        decision: "deny",
        reason: "unknown-scheme",
        open: null
      });
    }
  });
  test("denies missing or non-string scheme", () => {
    assert.deepStrictEqual(runFeature({ hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-scheme", open: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-scheme", open: null });
    assert.deepStrictEqual(runFeature({ scheme: 7, hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-scheme", open: null });
    assert.deepStrictEqual(runFeature({ scheme: null, hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-scheme", open: null });
    assert.deepStrictEqual(runFeature({ scheme: undefined, hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-scheme", open: null });
    assert.deepStrictEqual(runFeature({ scheme: { value: "http" }, hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-scheme", open: null });
  });
  test("denies missing or non-string hostport", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http" }), { decision: "deny", reason: "bad-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: 8080 }), { decision: "deny", reason: "bad-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: null }), { decision: "deny", reason: "bad-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: undefined }), { decision: "deny", reason: "bad-hostport", open: null });
  });
  test("denies unknown hostport", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "0.0.0.0:8080" }), { decision: "deny", reason: "unknown-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "localhost:8080" }), { decision: "deny", reason: "unknown-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:9090" }), { decision: "deny", reason: "unknown-hostport", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "" }), { decision: "deny", reason: "unknown-hostport", open: null });
  });
  test("denies unknown fields", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:8080", extra: "x" }), { decision: "deny", reason: "unknown-field", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:8080", url: "http" }), { decision: "deny", reason: "unknown-field", open: null });
  });
  test("denies non-object payloads", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", open: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", open: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", open: null });
    assert.deepStrictEqual(runFeature([{ scheme: "http" }]), { decision: "deny", reason: "bad-payload", open: null });
    assert.deepStrictEqual(runFeature("http"), { decision: "deny", reason: "bad-payload", open: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", open: null });
  });
  test("denies string values containing :// backslash or dotdot", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http://evil", hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-value", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:8080/../x" }), { decision: "deny", reason: "bad-value", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http", hostport: "127.0.0.1:8080\\x" }), { decision: "deny", reason: "bad-value", open: null });
    assert.deepStrictEqual(runFeature({ scheme: "http..", hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-value", open: null });
  });
  test("unknown-field takes precedence over bad-value", () => {
    assert.deepStrictEqual(runFeature({ scheme: "http://evil", hostport: "127.0.0.1:8080", extra: "x" }), { decision: "deny", reason: "unknown-field", open: null });
  });
  test("bad-value takes precedence over unknown-scheme", () => {
    assert.deepStrictEqual(runFeature({ scheme: "https://x", hostport: "127.0.0.1:8080" }), { decision: "deny", reason: "bad-value", open: null });
  });
  test("remains deterministic pure JSON and preserves input", () => {
    const payload = { scheme: "http", hostport: "127.0.0.1:8080" };
    const first = runFeature(payload);
    const second = runFeature({ scheme: "http", hostport: "127.0.0.1:8080" });
    assert.deepStrictEqual(first, second);
    assert.deepStrictEqual(payload, { scheme: "http", hostport: "127.0.0.1:8080" });
    assert.strictEqual(JSON.stringify(first), JSON.stringify(JSON.parse(JSON.stringify(first))));
    const text = runFeature.toString();
    assert.ok(text.includes("Object.entries"));
    assert.ok(text.includes("new Map"));
    assert.ok(!text.includes("Date"));
  });
});
