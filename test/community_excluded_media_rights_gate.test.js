import { test } from "node:test";
import assert from "node:assert/strict";
import { runFeature } from "../js/community/excluded_media_rights_gate.mjs";

test("allow image with unestablished rights", () => {
  assert.deepEqual(runFeature({ media: "image", rights: "unestablished" }), { decision: "allow", reason: "ok-excluded", ruling: { media: "image", rights: "unestablished" } });
});

test("allow model-3d with unestablished rights", () => {
  assert.deepEqual(runFeature({ media: "model-3d", rights: "unestablished" }), { decision: "allow", reason: "ok-excluded", ruling: { media: "model-3d", rights: "unestablished" } });
});

test("allow voice with unestablished rights", () => {
  assert.deepEqual(runFeature({ media: "voice", rights: "unestablished" }), { decision: "allow", reason: "ok-excluded", ruling: { media: "voice", rights: "unestablished" } });
});

test("allow marketing with unestablished rights", () => {
  assert.deepEqual(runFeature({ media: "marketing", rights: "unestablished" }), { decision: "allow", reason: "ok-excluded", ruling: { media: "marketing", rights: "unestablished" } });
});

test("deny non-object payloads with bad-payload", () => {
  assert.deepEqual(runFeature(null), { decision: "deny", reason: "bad-payload", ruling: null });
  assert.deepEqual(runFeature(undefined), { decision: "deny", reason: "bad-payload", ruling: null });
  assert.deepEqual(runFeature("image"), { decision: "deny", reason: "bad-payload", ruling: null });
  assert.deepEqual(runFeature(42), { decision: "deny", reason: "bad-payload", ruling: null });
  assert.deepEqual(runFeature(true), { decision: "deny", reason: "bad-payload", ruling: null });
});

test("deny array payload with bad-payload", () => {
  assert.deepEqual(runFeature([]), { decision: "deny", reason: "bad-payload", ruling: null });
  assert.deepEqual(runFeature([{ media: "image", rights: "unestablished" }]), { decision: "deny", reason: "bad-payload", ruling: null });
});

test("deny unknown field", () => {
  assert.deepEqual(runFeature({ media: "image", rights: "unestablished", extra: "x" }), { decision: "deny", reason: "unknown-field", ruling: null });
  assert.deepEqual(runFeature({ unknown: "x" }), { decision: "deny", reason: "unknown-field", ruling: null });
});

test("deny string value containing colon-slash-slash", () => {
  assert.deepEqual(runFeature({ media: "image", rights: "https://example" }), { decision: "deny", reason: "bad-value", ruling: null });
});

test("deny string value containing backslash", () => {
  assert.deepEqual(runFeature({ media: "image\\evil", rights: "unestablished" }), { decision: "deny", reason: "bad-value", ruling: null });
});

test("deny string value containing dotdot", () => {
  assert.deepEqual(runFeature({ media: "..", rights: "unestablished" }), { decision: "deny", reason: "bad-value", ruling: null });
  assert.deepEqual(runFeature({ media: "image", rights: "a..b" }), { decision: "deny", reason: "bad-value", ruling: null });
});

test("deny missing or non-string media with bad-media", () => {
  assert.deepEqual(runFeature({ rights: "unestablished" }), { decision: "deny", reason: "bad-media", ruling: null });
  assert.deepEqual(runFeature({}), { decision: "deny", reason: "bad-media", ruling: null });
  assert.deepEqual(runFeature({ media: 42, rights: "unestablished" }), { decision: "deny", reason: "bad-media", ruling: null });
  assert.deepEqual(runFeature({ media: null, rights: "unestablished" }), { decision: "deny", reason: "bad-media", ruling: null });
});

test("deny other media strings with unknown-media", () => {
  assert.deepEqual(runFeature({ media: "video", rights: "unestablished" }), { decision: "deny", reason: "unknown-media", ruling: null });
  assert.deepEqual(runFeature({ media: "audio", rights: "unestablished" }), { decision: "deny", reason: "unknown-media", ruling: null });
});

test("deny missing or non-string rights with bad-rights", () => {
  assert.deepEqual(runFeature({ media: "image" }), { decision: "deny", reason: "bad-rights", ruling: null });
  assert.deepEqual(runFeature({ media: "image", rights: 42 }), { decision: "deny", reason: "bad-rights", ruling: null });
  assert.deepEqual(runFeature({ media: "image", rights: null }), { decision: "deny", reason: "bad-rights", ruling: null });
});

test("deny other rights strings with unknown-rights", () => {
  assert.deepEqual(runFeature({ media: "image", rights: "granted" }), { decision: "deny", reason: "unknown-rights", ruling: null });
  assert.deepEqual(runFeature({ media: "voice", rights: "established" }), { decision: "deny", reason: "unknown-rights", ruling: null });
});

test("preserves input and is deterministic", () => {
  const input = { media: "marketing", rights: "unestablished" };
  const snapshot = JSON.stringify(input);
  const first = runFeature(input);
  const second = runFeature({ media: "marketing", rights: "unestablished" });
  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(first, second);
  assert.deepEqual(first, { decision: "allow", reason: "ok-excluded", ruling: { media: "marketing", rights: "unestablished" } });
});
