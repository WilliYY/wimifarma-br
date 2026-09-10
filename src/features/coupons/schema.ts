import { z } from "zod";
import { couponDateInput, isValidCouponDate } from "./coupon";

const numeric = z.union([
  z.number(),
  z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, "Informe um numero valido.")
    .transform((value) => Number(value.replace(",", "."))),
]);
const money = numeric.pipe(z.number().min(0).max(99999999.99))
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, "Use no maximo duas casas decimais.");
const integer = numeric.pipe(z.number().int().min(0).max(2147483647));
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  schema.optional(),
);
const date = z.string().refine(isValidCouponDate, "Data invalida.").nullable().optional();

const fields = {
  code: z.string().trim().toUpperCase().transform((value) => value.replace(/\s+/g, "-"))
    .pipe(z.string().min(3).max(40).regex(/^[A-Z0-9_-]+$/, "Use letras, numeros, hifen ou underline.")),
  description: optional(z.string().trim().max(500)),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"]),
  value: money.default(0),
  minOrderValue: optional(money),
  maxUses: optional(integer.refine((value) => value > 0, "O limite deve ser maior que zero.")),
  startsAt: date,
  endsAt: date,
  durationDays: integer.pipe(z.number().min(1).max(365)).optional(),
  isActive: z.boolean().default(true),
};

function validateCoupon(coupon: z.infer<z.ZodObject<typeof fields>>, context: z.RefinementCtx) {
  if (coupon.type !== "FREE_DELIVERY" && coupon.value <= 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "O desconto deve ser maior que zero." });
  }
  if (coupon.type === "PERCENTAGE" && coupon.value > 100) {
    context.addIssue({ code: "custom", path: ["value"], message: "O desconto percentual nao pode ultrapassar 100%." });
  }
  const effectiveStart = coupon.startsAt === undefined ? couponDateInput() : coupon.startsAt;
  if (effectiveStart && coupon.endsAt && coupon.endsAt < effectiveStart) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "O termino nao pode ser anterior ao inicio." });
  }
  if (coupon.endsAt !== undefined && coupon.durationDays !== undefined) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "Informe a data final ou a duracao, nao ambos." });
  }
}

export const couponCreateSchema = z.object({ ...fields, usesCount: integer.default(0) }).strict()
  .superRefine((coupon, context) => {
    validateCoupon(coupon, context);
    if (coupon.maxUses !== undefined && coupon.usesCount > coupon.maxUses) {
      context.addIssue({ code: "custom", path: ["maxUses"], message: "O limite nao pode ser menor que os usos registrados." });
    }
  }).transform((coupon) => ({ ...coupon, value: coupon.type === "FREE_DELIVERY" ? 0 : coupon.value }));

export const couponRevisionSchema = z.object({ expectedUpdatedAt: z.string().datetime() }).strict();
export const couponUpdateSchema = z.object({ ...fields, expectedUpdatedAt: z.string().datetime() }).strict()
  .superRefine(validateCoupon)
  .transform((coupon) => ({ ...coupon, value: coupon.type === "FREE_DELIVERY" ? 0 : coupon.value }));

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>;
