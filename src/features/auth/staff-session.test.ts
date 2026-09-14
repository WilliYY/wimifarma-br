import assert from "node:assert/strict";
import test from "node:test";
import { refreshStaffToken } from "./staff-session";

const token = { id: "staff-1", role: "ADMIN", email: "staff@example.test", sub: "staff-1" };
const active = { id: "staff-1", role: "ADMIN", isActive: true };

test("staff session rejects a legacy or deleted administrator", async () => {
  for (const id of ["demo-admin", "deleted-user"]) {
    assert.equal(await refreshStaffToken({ ...token, id }, async () => null), null);
  }
});

test("staff session rejects disabled users and absent ids", async () => {
  assert.equal(await refreshStaffToken(token, async () => ({ ...active, isActive: false })), null);
  for (const id of [undefined, "", 12]) {
    assert.equal(await refreshStaffToken({ ...token, id }, async () => { throw new Error("Lookup should not run"); }), null);
  }
});

test("staff session uses current persisted role without trusting old privileges", async () => {
  const result = await refreshStaffToken(token, async (id) => {
    assert.equal(id, token.id);
    return { ...active, role: "STAFF" };
  });
  assert.deepEqual(result, { ...token, role: "STAFF" });
  assert.equal(token.role, "ADMIN");
  assert.equal(await refreshStaffToken(token, async () => ({ ...active, role: "CUSTOMER" })), null);
  assert.equal(await refreshStaffToken(token, async () => ({ ...active, id: "another-user" })), null);
});

test("staff session preserves valid users and does not change customer authentication", async () => {
  assert.deepEqual(await refreshStaffToken(token, async () => active), token);
  const customer = { id: "customer-1", role: "CUSTOMER" };
  assert.equal(await refreshStaffToken(customer, async () => { throw new Error("Customer must not query staff"); }), customer);
});

test("staff session fails closed on unknown roles and database unavailability", async () => {
  assert.equal(await refreshStaffToken({ ...token, role: "UNKNOWN" }, async () => active), null);
  await assert.rejects(refreshStaffToken(token, async () => { throw new Error("database unavailable"); }), /database unavailable/);
});
