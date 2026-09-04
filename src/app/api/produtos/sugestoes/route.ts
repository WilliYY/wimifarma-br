import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/auth/permissions";
import {
  productSuggestionRequestSchema,
  suggestProductData,
} from "@/features/products/ai-suggestions";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if (guard.response) return guard.response;

  const parsed = productSuggestionRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "A IA do catalogo ainda nao foi configurada. Adicione GEMINI_API_KEY no servidor." },
      { status: 503 },
    );
  }

  try {
    const data = await suggestProductData(parsed.data, {
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao sugerir dados do produto com Gemini", error);
    return NextResponse.json(
      { error: "Nao foi possivel confirmar os dados deste produto agora. Confira o nome, a marca ou o EAN e tente novamente." },
      { status: 502 },
    );
  }
}
