import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { adminUserCreateSchema, adminUserRoles } from "@/features/admin-users/schema";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const userSelect = {
  createdAt: true,
  email: true,
  id: true,
  isActive: true,
  lastLoginAt: true,
  name: true,
  role: true,
  updatedAt: true,
} as const;

function persistedUserId(userId?: string) {
  return userId && userId !== "demo-admin" ? userId : undefined;
}

function requestedRoles(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const roles = searchParams
    .get("roles")
    ?.split(",")
    .map((role) => role.trim())
    .filter((role): role is (typeof adminUserRoles)[number] =>
      (adminUserRoles as readonly string[]).includes(role),
    );

  return roles?.length ? roles : undefined;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const roles = requestedRoles(request);
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: userSelect,
    take: 100,
    where: roles ? { role: { in: roles } } : undefined,
  });

  return NextResponse.json({ data: users });
}

export async function POST(request: Request) {
  const guard = await requireAdminOnlyApi();
  if (guard.response) return guard.response;

  const body = await readJsonBody(request);
  const parsed = adminUserCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const prisma = getPrisma();
  const customerWithEmail = await prisma.customer.findUnique({
    select: { id: true },
    where: { email: parsed.data.email },
  });

  if (customerWithEmail) {
    return NextResponse.json(
      {
        error:
          "Esse email ja pertence a uma conta de cliente. Use um email administrativo diferente.",
      },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
      },
      select: userSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_USER_CREATED",
        entity: "User",
        entityId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
        },
        userId: persistedUserId(guard.session?.user.id),
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "Ja existe um acesso administrativo com esse email." },
        { status: 409 },
      );
    }

    throw error;
  }
}
