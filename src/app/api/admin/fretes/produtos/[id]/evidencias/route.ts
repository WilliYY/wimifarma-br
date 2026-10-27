import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { ShippingError } from "@/features/shipping/schema";
import { logisticsEvidenceSchema, evidenceStatus, normalizeLogisticsGtin, mergeLogisticsEvidence } from "@/features/shipping/logistics-evidence";
import { prepareProtectedDraft } from "@/features/shipping/packaging-recipe";
import { shippingCargoKindsSchema } from "@/features/shipping/cargo-policy";
import { requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const { id } = await context.params;
    const product = await getPrisma().product.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, ean: true, eanNormalized: true, logisticsEvidence: true, updatedAt: true } });
    if (!product) throw new ShippingError("Produto não encontrado.", 404);
    return NextResponse.json({ data: { ...product, gtin: normalizeLogisticsGtin(product.eanNormalized ?? product.ean), evidenceStatus: evidenceStatus(product.logisticsEvidence) } }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
export async function PUT(request: Request, context: Context) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = z.object({ evidence: logisticsEvidenceSchema, updatedAt: z.iso.datetime(), decisionReason: z.string().trim().min(5).max(500).optional() }).strict().safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira o contrato da evidência física e a versão do produto.");
    const { id } = await context.params;
    await getPrisma().$transaction(async tx => {
      if (!await tx.user.findFirst({ where: { id: guard.session!.user.id, role: "ADMIN", isActive: true }, select: { id: true } })) throw new ShippingError("ADMIN ativo obrigatório.", 403);
      const product = await tx.product.findFirst({ where: { id, deletedAt: null } });
      if (!product) throw new ShippingError("Produto não encontrado.", 404);
      if (normalizeLogisticsGtin(product.eanNormalized ?? product.ean) !== parsed.data.evidence.gtin) throw new ShippingError("GTIN da evidência diverge do produto.");
      let evidence;
      try { evidence = mergeLogisticsEvidence(product.logisticsEvidence, parsed.data.evidence); } catch { throw new ShippingError("Preserve as fontes anteriores e confira o identificador da evidência."); }
      const previous = logisticsEvidenceSchema.safeParse(product.logisticsEvidence).data;
      evidence.sourceDecisions = parsed.data.evidence.sourceDecisions;
      if (evidence.sourceDecisions.some(decision => !evidence.observations.some(item => item.id === decision.observationId))) throw new ShippingError("Decisão aponta para fonte inexistente.");
      const decisionsChanged = JSON.stringify(evidence.sourceDecisions) !== JSON.stringify(previous?.sourceDecisions ?? []);
      if (decisionsChanged && !parsed.data.decisionReason) throw new ShippingError("Justifique a alteração ou reativação de fontes.");
      const changed = JSON.stringify(evidence.observations) !== JSON.stringify(previous?.observations ?? []) || decisionsChanged;
      evidence.review = changed ? { confirmed: false, note: "" } : parsed.data.evidence.review;
      const result = await tx.product.updateMany({ where: { id, deletedAt: null, updatedAt: new Date(parsed.data.updatedAt) }, data: { logisticsEvidence: evidence } });
      if (result.count !== 1) throw new ShippingError("O produto mudou. Atualize a página.", 409);
      await tx.auditLog.create({ data: { userId: guard.session!.user.id, action: "PRODUCT_LOGISTICS_EVIDENCE_UPDATED", entity: "Product", entityId: id, metadata: { gtin: evidence.gtin, status: evidenceStatus(evidence), observations: evidence.observations.map(item => ({ id: item.id, sha256: item.source.sha256 })), sourceDecisionsBefore: previous?.sourceDecisions ?? [], sourceDecisionsAfter: evidence.sourceDecisions, decisionReason: parsed.data.decisionReason ?? null, review: evidence.review } } });
    });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
export async function POST(request: Request, context: Context) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = z.object({ recipeId: z.string().min(1).max(64), cargoKinds: shippingCargoKindsSchema }).strict().safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Selecione receita e classificação da carga.");
    const { id } = await context.params;
    const db = getPrisma();
    const product = await db.product.findFirst({ where: { id, deletedAt: null } });
    const recipe = await db.packagingRecipe.findUnique({ where: { id: parsed.data.recipeId } });
    if (!product || !recipe) throw new ShippingError("Produto ou receita não encontrado.", 404);
    const identityMatches = logisticsEvidenceSchema.safeParse(product.logisticsEvidence).data?.gtin === normalizeLogisticsGtin(product.eanNormalized ?? product.ean);
    const preview = prepareProtectedDraft({ evidence: identityMatches ? product.logisticsEvidence : null, recipe: recipe.data, cargoKinds: parsed.data.cargoKinds, existingProfile: product.shippingProfile, freightEligible: !requiresPharmacyShippingSupport(product) });
    return NextResponse.json({ data: preview, previewOnly: true }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
