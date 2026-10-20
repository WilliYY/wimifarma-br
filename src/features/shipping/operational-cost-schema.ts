import { z } from "zod";

const cents = z.number().int().min(0).max(10_000_000).nullable().default(null);
export const shippingOperationalCostSchema = z.object({
  serviceId: z.number().int().positive(),
  routeKey: z.string().max(400),
  tripCostCents: cents,
  parcelsPerTrip: z.number().int().min(1).max(1000).default(1),
  collectionFeeCents: cents,
  extraInsuranceCents: cents,
  returnReserveCents: cents,
  otherFeesCents: cents,
});
export type ShippingOperationalCost = z.infer<typeof shippingOperationalCostSchema>;
