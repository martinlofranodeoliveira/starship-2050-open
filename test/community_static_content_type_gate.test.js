import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/static_content_type_gate.mjs";

describe("static content-type gate", () => {
  it("allows root index.html as text/html", () => {
    assert.deepStrictEqual(runFeature({ folder: "root", file: "index.html" }), { decision: "allow", reason: "ok-media", media: { folder: "root", file: "index.html", contentType: "text/html" } });
  });
  it("allows js file as text/javascript", () => {
    assert.deepStrictEqual(runFeature({ folder: "js", file: "game.js" }), { decision: "allow", reason: "ok-media", media: { folder: "js", file: "game.js", contentType: "text/javascript" } });
  });
  it("allows css file as text/css", () => {
    assert.deepStrictEqual(runFeature({ folder: "css", file: "style.css" }), { decision: "allow", reason: "ok-media", media: { folder: "css", file: "style.css", contentType: "text/css" } });
  });
  it("allows hyphen underscore digits in names", () => {
    assert.deepStrictEqual(runFeature({ folder: "js", file: "my-file_2.js" }), { decision: "allow", reason: "ok-media", media: { folder: "js", file: "my-file_2.js", contentType: "text/javascript" } });
  });
  it("rejects mismatched pairs", () => {
    assert.deepStrictEqual(runFeature({ folder: "css", file: "game.js" }), { decision: "deny", reason: "mismatch-type", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "style.css" }), { decision: "deny", reason: "mismatch-type", media: null });
    assert.deepStrictEqual(runFeature({ folder: "root", file: "game.js" }), { decision: "deny", reason: "mismatch-type", media: null });
    assert.deepStrictEqual(runFeature({ folder: "root", file: "other.html" }), { decision: "deny", reason: "mismatch-type", media: null });
  });
  it("rejects empty basenames", () => {
    assert.deepStrictEqual(runFeature({ folder: "js", file: ".js" }), { decision: "deny", reason: "mismatch-type", media: null });
    assert.deepStrictEqual(runFeature({ folder: "css", file: ".css" }), { decision: "deny", reason: "mismatch-type", media: null });
  });
  it("rejects non-object payloads as bad-payload", () => {
    assert.deepStrictEqual(runFeature(null), { decision: "deny", reason: "bad-payload", media: null });
    assert.deepStrictEqual(runFeature([]), { decision: "deny", reason: "bad-payload", media: null });
    assert.deepStrictEqual(runFeature("js"), { decision: "deny", reason: "bad-payload", media: null });
    assert.deepStrictEqual(runFeature(42), { decision: "deny", reason: "bad-payload", media: null });
    assert.deepStrictEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", media: null });
  });
  it("rejects unknown fields", () => {
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a.js", extra: "x" }), { decision: "deny", reason: "unknown-field", media: null });
  });
  it("rejects unsafe values as bad-value", () => {
    const backslash = String.fromCharCode(92);
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a..js" }), { decision: "deny", reason: "bad-value", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a" + backslash + "b.js" }), { decision: "deny", reason: "bad-value", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "http://x" }), { decision: "deny", reason: "bad-value", media: null });
    assert.deepStrictEqual(runFeature({ folder: "..", file: "a.js" }), { decision: "deny", reason: "bad-value", media: null });
  });
  it("rejects bad and unknown folders", () => {
    assert.deepStrictEqual(runFeature({ file: "a.js" }), { decision: "deny", reason: "bad-folder", media: null });
    assert.deepStrictEqual(runFeature({ folder: 7, file: "a.js" }), { decision: "deny", reason: "bad-folder", media: null });
    assert.deepStrictEqual(runFeature({}), { decision: "deny", reason: "bad-folder", media: null });
    assert.deepStrictEqual(runFeature({ folder: "img", file: "a.js" }), { decision: "deny", reason: "unknown-folder", media: null });
  });
  it("rejects bad files", () => {
    assert.deepStrictEqual(runFeature({ folder: "js" }), { decision: "deny", reason: "bad-file", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "" }), { decision: "deny", reason: "bad-file", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a/b.js" }), { decision: "deny", reason: "bad-file", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a:b.js" }), { decision: "deny", reason: "bad-file", media: null });
  });
  it("rejects bad names", () => {
    assert.deepStrictEqual(runFeature({ folder: "js", file: "bad name.js" }), { decision: "deny", reason: "bad-name", media: null });
    assert.deepStrictEqual(runFeature({ folder: "js", file: "a!b.js" }), { decision: "deny", reason: "bad-name", media: null });
  });
  it("preserves input and is deterministic JSON", () => {
    const input = { folder: "js", file: "game.js" };
    const snapshot = JSON.stringify(input);
    const first = runFeature(input);
    const second = runFeature({ folder: "js", file: "game.js" });
    assert.strictEqual(JSON.stringify(input), snapshot);
    assert.deepStrictEqual(first, second);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), first);
  });
});
