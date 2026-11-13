import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const commerceEmailIdentitySelect = {
  status: true,
  email: true,
  googleSubject: true,
  googleVerifiedEmail: true,
  passwordRecoveryVerifiedEmail: true,
  passwordRecoveryVerifiedAt: true,
} as const satisfies Prisma.CustomerSelect;

const address = z.email().max(254);

export function hasVerifiedCommerceEmail<T extends Prisma.CustomerGetPayload<{ select: typeof commerceEmailIdentitySelect }>>(
  customer: T | null | undefined,
  now = new Date(),
): customer is T & { email: string } {
  if (!customer?.email || customer.status !== "ACTIVE" || !address.safeParse(customer.email).success) return false;
  return Boolean(
    (customer.passwordRecoveryVerifiedEmail === customer.email && customer.passwordRecoveryVerifiedAt && customer.passwordRecoveryVerifiedAt <= now) ||
    (customer.googleSubject && customer.googleVerifiedEmail === customer.email && customer.email.endsWith("@gmail.com")),
  );
}
