import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOnlyApi } from "@/features/auth/permissions";
import { getPrisma } from "@/lib/prisma";
import { noStore, shippingBody, shippingFailure } from "@/features/shipping/http";
import { ShippingError } from "@/features/shipping/schema";
import { packagingRecipeSchema } from "@/features/shipping/packaging-recipe";

export async function GET() {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const recipes = await getPrisma().packagingRecipe.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }], take: 100 });
    return NextResponse.json({ data: recipes }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
const requestSchema = z.object({ id: z.string().min(1).max(64).optional(), revision: z.number().int().min(0), recipe: packagingRecipeSchema }).strict();
export async function PUT(request: Request) {
  const guard = await requireAdminOnlyApi(); if (guard.response) return guard.response;
  try {
    const parsed = requestSchema.safeParse(await shippingBody(request));
    if (!parsed.success) throw new ShippingError("Confira os dados e a revisão da receita de embalagem.");
    const { id, revision, recipe } = parsed.data;
    if (!id && revision !== 0) throw new ShippingError("Nova receita deve começar na revisão zero.");
    const saved = await getPrisma().$transaction(async tx => {
      if (!await tx.user.findFirst({ where: { id: guard.session!.user.id, role: "ADMIN", isActive: true }, select: { id: true } })) throw new ShippingError("ADMIN ativo obrigatório.", 403);
      let recipeId = id;
      if (id) {
        const result = await tx.packagingRecipe.updateMany({ where: { id, revision }, data: { name: recipe.name, data: recipe, revision: { increment: 1 } } });
        if (result.count !== 1) throw new ShippingError("A receita mudou. Atualize a página.", 409);
      } else {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('logistics-packaging-recipes'))`;
        if (await tx.packagingRecipe.count() >= 100) throw new ShippingError("Limite de 100 receitas; revise as existentes.");
        recipeId = (await tx.packagingRecipe.create({ data: { name: recipe.name, data: recipe } })).id;
      }
      await tx.auditLog.create({ data: { userId: guard.session!.user.id, action: "PACKAGING_RECIPE_SAVED", entity: "PackagingRecipe", entityId: recipeId!, metadata: { previousRevision: revision, recipe } } });
      return { id: recipeId, revision: revision + 1 };
    });
    return NextResponse.json({ ok: true, data: saved }, { headers: noStore });
  } catch (error) { return shippingFailure(error); }
}
