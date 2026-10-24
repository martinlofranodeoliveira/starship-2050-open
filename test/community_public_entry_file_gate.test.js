import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/public_entry_file_gate.mjs";

test("accepts index.html with html", () => {
  assert.deepEqual(runFeature({ file: "index.html", kind: "html" }), { decision: "allow", reason: "ok-entry", entry: { file: "index.html", kind: "html" } });
});

test("accepts js/game.js with js", () => {
  assert.deepEqual(runFeature({ file: "js/game.js", kind: "js" }), { decision: "allow", reason: "ok-entry", entry: { file: "js/game.js", kind: "js" } });
});

test("accepts css/style.css with css", () => {
  assert.deepEqual(runFeature({ file: "css/style.css", kind: "css" }), { decision: "allow", reason: "ok-entry", entry: { file: "css/style.css", kind: "css" } });
});

test("rejects mismatched pairing with mismatch-kind", () => {
  assert.deepEqual(runFeature({ file: "index.html", kind: "js" }), { decision: "deny", reason: "mismatch-kind", entry: null });
  assert.deepEqual(runFeature({ file: "js/game.js", kind: "css" }), { decision: "deny", reason: "mismatch-kind", entry: null });
  assert.deepEqual(runFeature({ file: "css/style.css", kind: "html" }), { decision: "deny", reason: "mismatch-kind", entry: null });
});

test("rejects unknown file with unknown-file", () => {
  assert.deepEqual(runFeature({ file: "js/extra.js", kind: "js" }), { decision: "deny", reason: "unknown-file", entry: null });
  assert.deepEqual(runFeature({ file: "private/secret.html", kind: "html" }), { decision: "deny", reason: "unknown-file", entry: null });
});

test("rejects unknown kind with unknown-kind", () => {
  assert.deepEqual(runFeature({ file: "index.html", kind: "json" }), { decision: "deny", reason: "unknown-kind", entry: null });
});

test("rejects non-object or array payload with bad-payload", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", entry: null });
  assert.deepEqual(runFeature("index.html"), { decision: "deny", reason: "bad-payload", entry: null });
  assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", entry: null });
  assert.deepEqual(runFeature([{ file: "index.html", kind: "html" }]), { decision: "deny", reason: "bad-payload", entry: null });
  assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", entry: null });
});

test("rejects unknown field with unknown-field", () => {
  assert.deepEqual(runFeature({ file: "index.html", kind: "html", extra: "x" }), { decision: "deny", reason: "unknown-field", entry: null });
});

test("rejects dangerous values with bad-value", () => {
  assert.deepEqual(runFeature({ file: "https://example.com", kind: "html" }), { decision: "deny", reason: "bad-value", entry: null });
  assert.deepEqual(runFeature({ file: "js\\game.js", kind: "js" }), { decision: "deny", reason: "bad-value", entry: null });
  assert.deepEqual(runFeature({ file: "../index.html", kind: "html" }), { decision: "deny", reason: "bad-value", entry: null });
});

test("rejects missing or non-string file or kind", () => {
  assert.deepEqual(runFeature({ kind: "html" }), { decision: "deny", reason: "bad-file", entry: null });
  assert.deepEqual(runFeature({ file: 123, kind: "html" }), { decision: "deny", reason: "bad-file", entry: null });
  assert.deepEqual(runFeature({ file: "index.html" }), { decision: "deny", reason: "bad-kind", entry: null });
  assert.deepEqual(runFeature({ file: "index.html", kind: 7 }), { decision: "deny", reason: "bad-kind", entry: null });
});

test("is deterministic and preserves input", () => {
  const input = { file: "index.html", kind: "html" };
  const first = runFeature(input);
  const second = runFeature({ file: "index.html", kind: "html" });
  assert.deepEqual(first, second);
  assert.deepEqual(input, { file: "index.html", kind: "html" });
});
