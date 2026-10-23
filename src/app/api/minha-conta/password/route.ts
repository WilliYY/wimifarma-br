import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { customerPasswordSchema } from "@/features/customers/schema";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const credentialSelect = {
  id: true,
  status: true,
  passwordHash: true,
  staffAccess: { select: { id: true, customerId: true, isActive: true, passwordHash: true } },
} as const;

class CredentialConflictError extends Error {}

function passwordFailure() {
  return NextResponse.json(
    { message: "Nao foi possivel alterar a senha. Confira a senha atual e tente novamente." },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const session = await auth();

  const customerId = sessionCustomerId(session);
  if (!customerId) {
    return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const parsed = customerPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const prisma = getPrisma();
    const customer = await prisma.customer.findUnique({
      select: credentialSelect,
      where: { id: customerId },
    });
    if (!customer || customer.status !== "ACTIVE" || customer.staffAccess?.isActive === false) {
      return passwordFailure();
    }

    // Only an explicit local staff link can supply the authoritative credential.
    const staff = customer.staffAccess;
    const localStaff = staff && staff.passwordHash !== "!GOOGLE_ONLY" ? staff : null;
    const currentHash = localStaff ? localStaff.passwordHash : customer.passwordHash;
    if (currentHash && (!parsed.data.currentPassword || !await compare(parsed.data.currentPassword, currentHash))) {
      return passwordFailure();
    }

    // Bcrypt runs before acquiring row locks. Revalidate every credential and link below.
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction(async tx => {
      // Match Club's User -> Customer lock order. Customer lock also guards new FK links.
      if (staff) await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${staff.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customer.id} FOR UPDATE`;
      const current = await tx.customer.findUnique({ where: { id: customer.id }, select: credentialSelect });
      const currentStaff = current?.staffAccess;
      if (!current || current.status !== "ACTIVE" || current.passwordHash !== customer.passwordHash ||
        (currentStaff?.id ?? null) !== (staff?.id ?? null) ||
        (currentStaff && (!currentStaff.isActive || currentStaff.customerId !== customer.id ||
          currentStaff.passwordHash !== staff?.passwordHash))) {
        throw new CredentialConflictError();
      }

      const customerWrite = await tx.customer.updateMany({
        where: { id: customer.id, status: "ACTIVE", passwordHash: customer.passwordHash },
        data: { passwordHash, passwordSetAt: new Date() },
      });
      if (customerWrite.count !== 1) throw new CredentialConflictError();
      // Google administrative access must never be unlocked by a customer password.
      if (localStaff) {
        const staffWrite = await tx.user.updateMany({
          where: { id: localStaff.id, customerId: customer.id, isActive: true, passwordHash: localStaff.passwordHash },
          data: { passwordHash },
        });
        if (staffWrite.count !== 1) throw new CredentialConflictError();
      }
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof CredentialConflictError) return passwordFailure();
    console.error("Customer password update failed.");
    return NextResponse.json(
      { message: "Nao foi possivel alterar a senha agora. Tente novamente mais tarde." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
