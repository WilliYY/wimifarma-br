import { z } from "zod";
import { shippingPackagingSchema, type ShippingPackaging } from "./schema";

export type PackingProduct = {
  id: string; width: number; height: number; length: number;
  weight: number; insurance_value: number; quantity: number;
};
export type PackingRequest = { products: PackingProduct[]; inputMeasurementBasis: ShippingPackaging["inputMeasurementBasis"]; conservativeEnvelope?: boolean };

const providerNumber = z.union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)]).transform(Number).pipe(z.number().finite().positive());
const providerPackagesSchema = z.array(z.object({
  dimensions: z.object({ width: providerNumber, height: providerNumber, length: providerNumber }),
  weight: providerNumber,
  insurance_value: providerNumber,
  products: z.array(z.object({ id: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
})).min(1).max(20);

/** Provider packing is a proposal; it does not certify a physical carton or add unknown tare. */
export function normalizeShippingPackaging(raw: unknown, request: PackingRequest): ShippingPackaging | null {
  const parsed = providerPackagesSchema.safeParse(raw);
  if (!parsed.success) return null;
  const result = shippingPackagingSchema.safeParse({
    version: 1, inputMeasurementBasis: request.inputMeasurementBasis,
    calculationMethod: request.conservativeEnvelope ? "provider-conservative-envelope" : "provider",
    packages: parsed.data.map(pack => ({
      widthCm: pack.dimensions.width, heightCm: pack.dimensions.height, lengthCm: pack.dimensions.length,
      weightGrams: Math.ceil(pack.weight * 1000 - 1e-8), insuranceValueCents: Math.round(pack.insurance_value * 100),
      items: pack.products.map(item => ({ productId: item.id, quantity: item.quantity })),
    })),
  });
  if (!result.success) return null;
  const quantities = new Map<string, number>();
  for (const pack of result.data.packages) for (const item of pack.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  if (quantities.size !== request.products.length || request.products.some(item => quantities.get(item.id) !== item.quantity)) return null;
  const indexed = new Map(request.products.map(item => [item.id, item]));
  // Check every package, so excess weight/insurance in another cannot hide an understated parcel.
  for (const pack of result.data.packages) {
    const sides = [pack.widthCm, pack.heightCm, pack.lengthCm].sort((a, b) => a - b);
    const expected = { weight: 0, volume: 0, insurance: 0 };
    for (const item of pack.items) {
      const unit = indexed.get(item.productId)!;
      if ([unit.width, unit.height, unit.length].sort((a, b) => a - b).some((side, index) => side > sides[index] + 1e-9)) return null;
      expected.weight += Math.round(unit.weight * 1000) * item.quantity;
      expected.volume += unit.width * unit.height * unit.length * item.quantity;
      expected.insurance += Math.round(unit.insurance_value * 100) * item.quantity;
    }
    if (pack.weightGrams < expected.weight || pack.widthCm * pack.heightCm * pack.lengthCm + expected.volume * 1e-9 < expected.volume || pack.insuranceValueCents < expected.insurance) return null;
  }
  return result.data;
}
