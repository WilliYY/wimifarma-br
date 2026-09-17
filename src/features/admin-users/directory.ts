import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export const accessSchema = z.object({
  kind: z.enum(["customer", "staff"]),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CUSTOMER"]),
  isActive: z.boolean(),
  version: z.string().datetime(),
}).strict();
export const directoryQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  role: z.enum(["ALL", "ADMIN", "MANAGER", "STAFF", "CUSTOMER"]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "BLOCKED"]).default("ALL"),
  sort: z.enum(["hierarchy", "spent", "orders", "recent"]).default("hierarchy"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export type DirectoryPerson = {
  id: string; kind: "customer" | "staff"; staffId: string | null;
  name: string; email: string | null; role: string; isActive: boolean;
  google: boolean; lastLoginAt: string | null; createdAt: string; version: string;
  orderCount: number; spentCents: number;
};
export class AccessError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export async function lockUserAccess(tx: Prisma.TransactionClient, actorId: string) {
  // All access mutations share this lock, including the legacy status endpoint.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(87164321)::text`;
  const actor = await tx.user.findUnique({ where: { id: actorId } });
  if (!actor?.isActive || actor.role !== "ADMIN") throw new AccessError("Acesso administrativo expirado.", 401);
}

export async function changeAccess(tx: Prisma.TransactionClient, actorId: string, id: string, input: z.infer<typeof accessSchema>) {
  await lockUserAccess(tx, actorId);
  let customer = input.kind === "customer" ? await tx.customer.findUnique({ where: { id } }) : null;
  let user = await tx.user.findUnique({ where: input.kind === "staff" ? { id } : { customerId: id } });
  if (input.kind === "customer" ? !customer : !user) throw new AccessError("Cadastro nao encontrado.", 404);
  const version = user?.updatedAt ?? customer!.updatedAt;
  if (version.toISOString() !== input.version) throw new AccessError("Este acesso mudou. Atualize a lista antes de salvar.");
  if (user?.id === actorId && (input.role !== "ADMIN" || !input.isActive)) throw new AccessError("Voce nao pode reduzir ou bloquear o proprio acesso.");
  if (user?.role === "ADMIN" && user.isActive && (input.role !== "ADMIN" || !input.isActive)) {
    const others = await tx.user.count({ where: { role: "ADMIN", isActive: true, id: { not: user.id } } });
    if (!others) throw new AccessError("Mantenha pelo menos um administrador ativo.");
  }
  const before = { role: user?.role ?? "CUSTOMER", isActive: user?.isActive ?? customer?.status === "ACTIVE" };
  if (!customer && user?.customerId) customer = await tx.customer.findUnique({ where: { id: user.customerId } });
  if (user && !customer && input.role === "CUSTOMER") {
    if (await tx.customer.findUnique({ where: { email: user.email } })) throw new AccessError("Este email possui outro cadastro. Confira o vinculo antes de alterar.");
    customer = await tx.customer.create({ data: { name: user.name, email: user.email, passwordHash: user.passwordHash, lastLoginAt: user.lastLoginAt } });
  }
  if (!user && input.role !== "CUSTOMER") {
    if (!customer?.email || (!customer.googleSubject && !customer.passwordHash)) throw new AccessError("O cliente precisa ter um login cadastrado antes de receber permissoes.");
    if (await tx.user.findUnique({ where: { email: customer.email } })) throw new AccessError("Ja existe outro acesso com esse email.");
    user = await tx.user.create({ data: {
      name: customer.name, email: customer.email, customerId: customer.id,
      passwordHash: customer.googleSubject ? "!GOOGLE_ONLY" : customer.passwordHash!,
      role: input.role, isActive: input.isActive, lastLoginAt: customer.lastLoginAt,
    } });
  } else if (user) {
    user = await tx.user.update({ where: { id: user.id }, data: { role: input.role, isActive: input.isActive, customerId: customer?.id ?? user.customerId } });
  }
  if (customer) await tx.customer.update({ where: { id: customer.id }, data: { status: input.isActive ? "ACTIVE" : "INACTIVE" } });
  await tx.auditLog.create({ data: { userId: actorId, action: "USER_ACCESS_CHANGED", entity: "UserAccess", entityId: user?.id ?? customer!.id,
    metadata: { customerId: customer?.id ?? null, before, after: { role: input.role, isActive: input.isActive } } } });
}

export async function getDirectory(tx: Prisma.TransactionClient, query: z.infer<typeof directoryQuerySchema>) {
  const cte = Prisma.sql`WITH purchases AS (
    SELECT "customerId", COUNT(*)::int AS "orderCount", SUM("totalCents")::float8 AS "spentCents"
    FROM "Order" WHERE "status" = 'COMPLETED' AND "paymentStatus" = 'PAID' AND "customerId" IS NOT NULL GROUP BY "customerId"
  ), people AS (
    SELECT c.id, 'customer'::text AS kind, u.id AS "staffId", c.name, c.email,
      COALESCE(u.role::text, 'CUSTOMER') AS role,
      (c.status = 'ACTIVE' AND COALESCE(u."isActive", true)) AS "isActive",
      (c."googleSubject" IS NOT NULL) AS google, GREATEST(c."lastLoginAt", u."lastLoginAt") AS "lastLoginAt",
      c."createdAt", COALESCE(u."updatedAt", c."updatedAt") AS version,
      COALESCE(p."orderCount", 0) AS "orderCount", COALESCE(p."spentCents", 0) AS "spentCents"
    FROM "Customer" c LEFT JOIN "User" u ON u."customerId" = c.id LEFT JOIN purchases p ON p."customerId" = c.id
    UNION ALL
    SELECT u.id, 'staff', u.id, u.name, u.email, u.role::text, u."isActive", false, u."lastLoginAt", u."createdAt", u."updatedAt", 0, 0
    FROM "User" u WHERE u."customerId" IS NULL
  )`;
  const filter = Prisma.sql`WHERE (${query.q} = '' OR name ILIKE ${`%${query.q}%`} OR email ILIKE ${`%${query.q}%`})
    AND (${query.role} = 'ALL' OR role = ${query.role})
    AND (${query.status} = 'ALL' OR "isActive" = ${query.status === "ACTIVE"})`;
  const ordering = {
    hierarchy: Prisma.sql`CASE role WHEN 'ADMIN' THEN 0 WHEN 'MANAGER' THEN 1 WHEN 'STAFF' THEN 2 ELSE 3 END, name, id`,
    spent: Prisma.sql`"spentCents" DESC, "orderCount" DESC, id`,
    orders: Prisma.sql`"orderCount" DESC, "spentCents" DESC, id`,
    recent: Prisma.sql`"lastLoginAt" DESC NULLS LAST, id`,
  }[query.sort];
  const rows = await tx.$queryRaw<(Omit<DirectoryPerson, "version" | "lastLoginAt" | "createdAt"> & { version: Date; lastLoginAt: Date | null; createdAt: Date })[]>(Prisma.sql`${cte} SELECT * FROM people ${filter} ORDER BY ${ordering} LIMIT 20 OFFSET ${(query.page - 1) * 20}`);
  const [count] = await tx.$queryRaw<{ total: number }[]>(Prisma.sql`${cte} SELECT COUNT(*)::int AS total FROM people ${filter}`);
  const [stats] = await tx.$queryRaw<{ total: number; admins: number; staff: number; customers: number; buyers: number }[]>(Prisma.sql`${cte} SELECT COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE role = 'ADMIN' AND "isActive")::int AS admins,
    COUNT(*) FILTER (WHERE role IN ('MANAGER','STAFF') AND "isActive")::int AS staff,
    COUNT(*) FILTER (WHERE role = 'CUSTOMER')::int AS customers,
    COUNT(*) FILTER (WHERE "orderCount" > 0)::int AS buyers FROM people`);
  return { data: rows.map(r => ({ ...r, version: r.version.toISOString(), createdAt: r.createdAt.toISOString(), lastLoginAt: r.lastLoginAt?.toISOString() ?? null })), total: count.total, stats, page: query.page, pageSize: 20 };
}
