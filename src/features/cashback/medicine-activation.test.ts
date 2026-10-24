import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@/generated/prisma/client";
import { applyMedicineCashback, medicineCashbackPlanSchema } from "./medicine-activation";

test("ativacao recusa autor ausente/invalido, origem divergente e plano vencido antes de acessar banco", async () => {
  let databaseCalls = 0;
  const tx = new Proxy({}, { get() { databaseCalls++; throw new Error("Banco não deve ser acessado."); } }) as Prisma.TransactionClient;
  const source = "a".repeat(40);
  const now = new Date();
  const plan = { rule: "generic-similar-1pct-v1", createdAt: now.toISOString(), sourceCommit: source, items: [] };
  for (const actor of [undefined, null, "", " ", "--plan", "id com espaço"]) {
    await assert.rejects(applyMedicineCashback(tx, plan, actor as string, source, now));
  }
  await assert.rejects(applyMedicineCashback(tx, plan, "admin-id", "b".repeat(40), now));
  await assert.rejects(applyMedicineCashback(tx, plan, "admin-id", source, new Date(now.getTime() + 900_001)));
  await assert.rejects(applyMedicineCashback(tx, plan, "admin-id", source, new Date(now.getTime() - 1)));
  assert.equal(databaseCalls, 0);
});

test("plano nao aceita duplicidade, campos extras ou alteracoes livres de percentual", () => {
  const item = { id: "product", eanNormalized: null, expectedUpdatedAt: new Date().toISOString(), cashbackEnabled: false, cashbackRateBps: 200 };
  const plan = { rule: "generic-similar-1pct-v1", createdAt: new Date().toISOString(), sourceCommit: "a".repeat(40), items: [item] };
  assert.equal(medicineCashbackPlanSchema.safeParse(plan).success, true);
  for (const invalid of [{ ...plan, items: [item, item] }, { ...plan, cashbackRateBps: 500 }, { ...plan, items: [{ ...item, price: 1 }] }]) {
    assert.equal(medicineCashbackPlanSchema.safeParse(invalid).success, false);
  }
});
