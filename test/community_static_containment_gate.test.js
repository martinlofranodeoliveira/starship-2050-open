import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/static_containment_gate.mjs";

test("allows regular-file with inside-root", () => {
  const out = runFeature({ entry: "regular-file", zone: "inside-root" });
  assert.deepEqual(out, { decision: "allow", reason: "ok-contained", containment: { entry: "regular-file", zone: "inside-root" } });
});

test("denies symlink even with inside-root", () => {
  const out = runFeature({ entry: "symlink", zone: "inside-root" });
  assert.deepEqual(out, { decision: "deny", reason: "not-contained", containment: null });
});

test("denies escaping even with inside-root", () => {
  const out = runFeature({ entry: "escaping", zone: "inside-root" });
  assert.deepEqual(out, { decision: "deny", reason: "not-contained", containment: null });
});

test("denies outside-root zone even with regular-file", () => {
  const out = runFeature({ entry: "regular-file", zone: "outside-root" });
  assert.deepEqual(out, { decision: "deny", reason: "not-contained", containment: null });
});

test("denies outside-root with symlink or escaping as not-contained", () => {
  assert.deepEqual(runFeature({ entry: "symlink", zone: "outside-root" }), { decision: "deny", reason: "not-contained", containment: null });
  assert.deepEqual(runFeature({ entry: "escaping", zone: "outside-root" }), { decision: "deny", reason: "not-contained", containment: null });
});

test("rejects bad payload shapes", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", containment: null });
  assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", containment: null });
  assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", containment: null });
  assert.deepEqual(runFeature([{ entry: "regular-file", zone: "inside-root" }]), { decision: "deny", reason: "bad-payload", containment: null });
  assert.deepEqual(runFeature("regular-file"), { decision: "deny", reason: "bad-payload", containment: null });
  assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", containment: null });
});

test("rejects unknown field", () => {
  assert.deepEqual(runFeature({ entry: "regular-file", zone: "inside-root", extra: "x" }), { decision: "deny", reason: "unknown-field", containment: null });
  assert.deepEqual(runFeature({ bogus: "regular-file" }), { decision: "deny", reason: "unknown-field", containment: null });
});

test("rejects bad values containing protocol, backslash or dotdot", () => {
  assert.deepEqual(runFeature({ entry: "https://example", zone: "inside-root" }), { decision: "deny", reason: "bad-value", containment: null });
  assert.deepEqual(runFeature({ entry: "regular-file", zone: "a\\b" }), { decision: "deny", reason: "bad-value", containment: null });
  assert.deepEqual(runFeature({ entry: "regular-file", zone: "inside-root.." }), { decision: "deny", reason: "bad-value", containment: null });
  assert.deepEqual(runFeature({ entry: "a..b", zone: "inside-root" }), { decision: "deny", reason: "bad-value", containment: null });
});

test("rejects bad or unknown entry", () => {
  assert.deepEqual(runFeature({ zone: "inside-root" }), { decision: "deny", reason: "bad-entry", containment: null });
  assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-entry", containment: null });
  assert.deepEqual(runFeature({ entry: 7, zone: "inside-root" }), { decision: "deny", reason: "bad-entry", containment: null });
  assert.deepEqual(runFeature({ entry: "directory", zone: "inside-root" }), { decision: "deny", reason: "unknown-entry", containment: null });
});

test("rejects bad or unknown zone", () => {
  assert.deepEqual(runFeature({ entry: "regular-file" }), { decision: "deny", reason: "bad-zone", containment: null });
  assert.deepEqual(runFeature({ entry: "regular-file", zone: 9 }), { decision: "deny", reason: "bad-zone", containment: null });
  assert.deepEqual(runFeature({ entry: "regular-file", zone: "deep-inside" }), { decision: "deny", reason: "unknown-zone", containment: null });
});

test("preserves input and stays deterministic with JSON values", () => {
  const payload = { entry: "regular-file", zone: "inside-root" };
  const before = JSON.stringify(payload);
  const first = runFeature(payload);
  const second = runFeature({ entry: "regular-file", zone: "inside-root" });
  assert.equal(JSON.stringify(payload), before);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(typeof first.decision, "string");
  assert.equal(typeof first.reason, "string");
  assert.deepEqual(Object.keys(first).sort(), ["containment", "decision", "reason"]);
});

test("bad-value takes precedence over unknown entry or zone", () => {
  assert.deepEqual(runFeature({ entry: "weird..value", zone: "inside-root" }), { decision: "deny", reason: "bad-value", containment: null });
  assert.deepEqual(runFeature({ entry: "regular-file", zone: "zone://x" }), { decision: "deny", reason: "bad-value", containment: null });
});
