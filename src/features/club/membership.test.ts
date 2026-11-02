import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { ensureClubMembership } from "./membership";

function fixture(activeCustomer = true, existing: { active: boolean } | null = null) {
  let membership = existing;
  let locked = false;
  const audits: unknown[] = [];
  let creations = 0;
  const tx = {
    $queryRaw: async () => { locked = true; return []; },
    customer: { findFirst: async () => { assert.ok(locked); return activeCustomer ? { id: "synthetic-customer" } : null; } },
    clubMembership: {
      findUnique: async () => membership,
      create: async ({ data }: { data: { customerId: string } }) => {
        assert.ok(locked); assert.equal(data.customerId, "synthetic-customer");
        assert.equal(membership, null); creations++; membership = { active: true }; return membership;
      },
    },
    auditLog: { create: async (input: unknown) => { audits.push(input); } },
  } as unknown as Prisma.TransactionClient;
  return { tx, audits, creations: () => creations };
}

test("inscreve cliente ativo uma vez sem criar carteira, bônus ou consentimento", async () => {
  const f = fixture();
  assert.deepEqual(await ensureClubMembership(f.tx, "synthetic-customer"), { active: true });
  assert.deepEqual(await ensureClubMembership(f.tx, "synthetic-customer"), { active: true });
  assert.equal(f.creations(), 1); assert.equal(f.audits.length, 1);
  assert.match(JSON.stringify(f.audits), /CLUB_AUTO_ENROLLED/);
  assert.doesNotMatch(JSON.stringify(f.audits), /email|phone|password|balance|consent/i);
});

test("preserva adesão desativada e adesão já existente", async () => {
  for (const active of [false, true]) {
    const f = fixture(true, { active });
    assert.deepEqual(await ensureClubMembership(f.tx, "synthetic-customer"), { active });
    assert.equal(f.creations(), 0); assert.equal(f.audits.length, 0);
  }
});

test("cliente inativo, ausente ou identidade vazia não gera adesão", async () => {
  const f = fixture(false);
  await assert.rejects(ensureClubMembership(f.tx, "synthetic-customer"));
  await assert.rejects(ensureClubMembership(f.tx, ""));
  assert.equal(f.creations(), 0); assert.equal(f.audits.length, 0);
});
