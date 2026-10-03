import assert from "node:assert/strict";
import test from "node:test";
import { readVisitorId, signVisitorId, validVisitorId, VISITOR_COOKIE_MAX_AGE } from "./visitor-identity";

const id = "12345678-1234-4123-8123-123456789012";
const secret = "synthetic-test-secret";
const now = Date.UTC(2026, 9, 3, 12);

test("signed identity persists for a year and rejects tampering, other secret and future dates", () => {
  const token = signVisitorId(id, secret, now);
  assert.equal(readVisitorId(token, secret, now), id);
  assert.equal(readVisitorId(token, secret, now + VISITOR_COOKIE_MAX_AGE * 1000), id);
  assert.equal(readVisitorId(token, secret, now + VISITOR_COOKIE_MAX_AGE * 1000 + 1), null);
  assert.equal(readVisitorId(token, "different-secret", now), null);
  assert.equal(readVisitorId(token.replace(id, "23456789-1234-4123-8123-123456789012"), secret, now), null);
  assert.equal(readVisitorId(token, secret, now - 1), null);
  assert.equal(readVisitorId(`${token}.extra`, secret, now), null);
  assert.equal(readVisitorId("malformed", secret, now), null);
});

test("legacy identifiers remain valid while invalid or oversized identifiers are rejected", () => {
  assert.equal(validVisitorId("visit-1780000000000-oldbrowser"), true);
  assert.equal(validVisitorId(id), true);
  for (const value of [null, 123, "short", "a".repeat(81), "visitor with spaces", "<script>visitor</script>"]) {
    assert.equal(validVisitorId(value), false);
  }
});
