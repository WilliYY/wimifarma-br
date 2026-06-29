import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().positive().optional(),
);

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

function isValidLocalDate(value: string) {
  return !Number.isNaN(new Date(`${value}T00:00:00.000-03:00`).getTime());
}

export const couponCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((value) => value.toUpperCase().replace(/\s+/g, "-"))
    .refine((value) => /^[A-Z0-9_-]+$/.test(value), {
      message: "Use apenas letras, numeros, hifen ou underline.",
    }),
  description: optionalString.pipe(z.string().max(500).optional()),
  durationDays: z.coerce.number().int().min(1).max(365).default(7),
  isActive: z.boolean().default(true),
  maxUses: optionalPositiveInt,
  minOrderValue: optionalPositiveNumber,
  startsAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isValidLocalDate, { message: "Data inicial invalida." })
    .optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"]),
  usesCount: z.coerce.number().int().min(0).default(0),
  value: z.coerce.number().min(0).default(0),
}).superRefine((coupon, context) => {
  if (coupon.type === "PERCENTAGE" && (coupon.value <= 0 || coupon.value > 100)) {
    context.addIssue({
      code: "custom",
      message: "Cupom percentual precisa ter valor entre 1 e 100.",
      path: ["value"],
    });
  }

  if (coupon.type === "FIXED_AMOUNT" && coupon.value <= 0) {
    context.addIssue({
      code: "custom",
      message: "Cupom de valor fixo precisa ter valor maior que zero.",
      path: ["value"],
    });
  }

  if (coupon.maxUses && coupon.usesCount > coupon.maxUses) {
    context.addIssue({
      code: "custom",
      message: "Usos registrados nao podem ser maiores que o limite.",
      path: ["usesCount"],
    });
  }
});

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;
