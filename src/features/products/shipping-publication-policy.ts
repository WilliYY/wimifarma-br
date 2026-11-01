import { isNotifyOnlyPendingLogistics } from "./notify-only";
import { shippingAdminProfileSchema, shippingDraftSchema } from "@/features/shipping/product-draft";
import { permittedShippingServices, requiresPharmacyShippingSupport } from "@/features/shipping/eligibility";
import { shippingProfileSchema } from "@/features/shipping/schema";
import { isKnownShippingService } from "@/features/shipping/cargo-policy";
import type { PrescriptionType } from "./purchase-policy";
import { ProductMutationError } from "./mutations";

type PublicationProduct = {
  status: string; name?: string; category?: string | null; requiresPrescription: boolean;
  prescriptionType?: PrescriptionType; isPopularPharmacy?: boolean;
  catalogClassification?: unknown; shippingProfile?: unknown;
};

/** Caller validates the effective product under the existing catalog/product locks. */
export function validateShippingPublication(current: { status: string; shippingProfile?: unknown } | null, next: PublicationProduct) {
  if (next.status !== "ACTIVE") return;
  const held = isNotifyOnlyPendingLogistics(next.shippingProfile);
  const wasHeld = isNotifyOnlyPendingLogistics(current?.shippingProfile);
  if (held) {
    const draft = (wasHeld ? shippingAdminProfileSchema : shippingDraftSchema).safeParse(next.shippingProfile);
    if (!draft.success || draft.data.notifyOnlyPendingLogistics !== true ||
      (!wasHeld && (draft.data.measurementBasis !== "unknown" ||
        [draft.data.weightGrams, draft.data.widthCm, draft.data.heightCm, draft.data.lengthCm].some(value => value !== null)))) {
      throw new ProductMutationError("Avise-me exige rascunho logístico explícito, sem aprovação ou medidas presumidas.");
    }
    return;
  }
  if (current?.status === "ACTIVE" && !wasHeld) return;
  const profile = shippingProfileSchema.safeParse(next.shippingProfile);
  const raw = next.shippingProfile;
  if (!profile.success || !raw || typeof raw !== "object" || !("measurementBasis" in raw) || raw.measurementBasis !== "measured") {
    throw new ProductMutationError("Antes de publicar, salve como rascunho e revise peso e medidas reais da embalagem em Fretes e entregas.");
  }
  const product = { ...next, category: next.category ?? null, isPopularPharmacy: next.isPopularPharmacy ?? false };
  // Assisted products remain protected by checkout/shipping eligibility; publication does not enable them.
  if (requiresPharmacyShippingSupport(product)) return;
  if (!profile.data.enabled) {
    throw new ProductMutationError("Antes de publicar, ADMIN deve revisar e habilitar o transporte em Fretes e entregas.");
  }
  if (!profile.data.cargoKinds?.length || profile.data.cargoKinds.includes("unspecified")) {
    throw new ProductMutationError("Antes de publicar, ADMIN deve informar a carga do transporte em Fretes e entregas.");
  }
  const approved = profile.data.approvedServiceIds;
  if (!approved?.length || !permittedShippingServices(approved.filter(isKnownShippingService), [product]).length) {
    throw new ProductMutationError("Antes de publicar, ADMIN deve aprovar ao menos um serviço de transporte compatível em Fretes e entregas.");
  }
}
