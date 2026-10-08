import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decryptValue } from "@/lib/secret-vault";
import { retrieveAsaasFees } from "./asaas-fees";
import { PaymentError } from "./schema";

export const asaasSandboxInput = z.object({ credentialId: z.string().trim().min(1).max(128) }).strict();

export async function listAsaasSandboxCredentials() {
  return getPrisma().secretCredential.findMany({
    where: { service: { equals: "Asaas", mode: "insensitive" }, identifier: { equals: "sandbox", mode: "insensitive" } },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }, take: 100,
  });
}

export async function checkAsaasSandbox(credentialId: string, userId: string) {
  const prisma = getPrisma();
  const row = await prisma.secretCredential.findUnique({ where: { id: credentialId }, select: {
    id: true, service: true, identifier: true, secretCiphertext: true, secretIv: true, secretTag: true,
  } });
  if (!row || row.service?.toLowerCase() !== "asaas" || row.identifier?.toLowerCase() !== "sandbox") {
    throw new PaymentError("Selecione uma credencial Asaas Sandbox do cofre.", 422);
  }
  const apiKey = decryptValue({ ciphertext: row.secretCiphertext, iv: row.secretIv, tag: row.secretTag });
  // Newly generated Asaas Sandbox keys have this official environment prefix.
  if (!apiKey.startsWith("$aact_hmlg_") || apiKey.length > 500 || /\s/.test(apiKey)) {
    throw new PaymentError("A credencial selecionada não é uma chave Sandbox válida.", 422);
  }
  const rules = await retrieveAsaasFees(apiKey, "sandbox", 1);
  const checkedAt = new Date().toISOString();
  await prisma.auditLog.create({ data: {
    action: "ASAAS_SANDBOX_CONNECTION_CHECKED", entity: "SecretCredential", entityId: row.id, userId,
    metadata: { checkedAt, feeRuleCount: rules.length },
  } });
  return { validated: true as const, feeRuleCount: rules.length, checkedAt };
}
