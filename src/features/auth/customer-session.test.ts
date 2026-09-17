import assert from "node:assert/strict";
import test from "node:test";
import { isVerifiedGoogleProfile, refreshCustomerToken } from "./customer-session";

test("Google verification requires trusted boolean, email and matching subject", () => {
  const profile = { email: "synthetic@example.test", email_verified: true, sub: "google-1" };
  assert.equal(isVerifiedGoogleProfile(profile, "google-1"), true);
  for (const email_verified of [false, undefined, "true"]) assert.equal(isVerifiedGoogleProfile({ ...profile, email_verified }, "google-1"), false);
  assert.equal(isVerifiedGoogleProfile(profile, "another"), false);
  assert.equal(isVerifiedGoogleProfile(undefined, "google-1"), false);
});

const customer = { id: "c1", status: "ACTIVE", googleSubject: "google-1", staffAccess: { id: "u1", role: "ADMIN", isActive: true } };
test("only a verified Google identity with explicit staff link gains access", async () => {
  const old = { id: "c1", role: "CUSTOMER" };
  assert.equal((await refreshCustomerToken(old, async () => customer))?.role, "CUSTOMER");
  const google = { ...old, googleSubject: "google-1", customerId: "c1" };
  assert.deepEqual(await refreshCustomerToken(google, async () => customer), { ...google, id: "u1", role: "ADMIN" });
  assert.equal(await refreshCustomerToken({ ...google, googleSubject: "wrong" }, async () => customer), null);
});
test("linked Google sessions follow demotion and blocking immediately", async () => {
  const token = { id: "u1", role: "ADMIN", customerId: "c1", googleSubject: "google-1" };
  assert.equal((await refreshCustomerToken(token, async () => ({ ...customer, staffAccess: { ...customer.staffAccess, role: "CUSTOMER" } })))?.id, "c1");
  assert.equal(await refreshCustomerToken(token, async () => ({ ...customer, status: "INACTIVE" })), null);
  assert.equal(await refreshCustomerToken(token, async () => ({ ...customer, staffAccess: { ...customer.staffAccess, isActive: false } })), null);
  assert.equal(await refreshCustomerToken(token, async () => null), null);
});
