import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildMiaubySystemPrompt,
  cleanMiaubyReply,
  keepMiaubyQuestionLocal,
  miaubyFallbackReply,
  miaubyReplyProducts,
  miaubyRequestSchema,
  miaubySearchTokens,
  rankMiaubyCatalogProducts,
  sanitizeMiaubyHistory,
  type MiaubyCatalogSource,
} from "@/features/miauby/assistant";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const productSelect = {
  activeIngredients: true,
  brand: true,
  category: true,
  id: true,
  imageUrl: true,
  isPopularPharmacy: true,
  name: true,
  price: true,
  promotionalPrice: true,
  requiresPrescription: true,
  searchTerms: true,
  searchText: true,
  slug: true,
} as const;

type CatalogProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function serializeCatalogProduct(product: CatalogProduct): MiaubyCatalogSource {
  return {
    activeIngredients: product.activeIngredients,
    brand: product.brand,
    category: product.category,
    id: product.id,
    imageUrl: product.imageUrl,
    isPopularPharmacy: product.isPopularPharmacy,
    name: product.name,
    price: product.price.toString(),
    promotionalPrice: product.promotionalPrice?.toString() ?? null,
    requiresPrescription: product.requiresPrescription,
    searchTerms: product.searchTerms,
    searchText: product.searchText,
    slug: product.slug,
  };
}

async function findRelatedCatalogProducts(message: string) {
  const tokens = miaubySearchTokens(message);
  if (!tokens.length) return [];

  const products = await getPrisma().product.findMany({
    orderBy: [{ featuredPosition: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: productSelect,
    take: 24,
    where: {
      OR: tokens.map((token) => ({ searchText: { contains: token } })),
      status: "ACTIVE",
    },
  });

  return rankMiaubyCatalogProducts(
    message,
    products.map(serializeCatalogProduct),
  );
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
    status,
  });
}

export async function POST(request: Request) {
  const parsed = miaubyRequestSchema.safeParse(await readJsonBody(request));

  if (!parsed.success) {
    return json({ error: "Envie uma pergunta de ate 500 caracteres." }, 422);
  }

  const { message } = parsed.data;
  const history = sanitizeMiaubyHistory(parsed.data.history);
  let products = [] as Awaited<ReturnType<typeof findRelatedCatalogProducts>>;

  try {
    products = await findRelatedCatalogProducts(message);
  } catch (error) {
    console.error("Erro ao consultar catalogo para Miauby", error);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const replyProducts = miaubyReplyProducts(message, products);

  if (!apiKey || keepMiaubyQuestionLocal(message)) {
    return json({
      message: miaubyFallbackReply(message, replyProducts),
      products: replyProducts,
      source: "fallback",
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        body: JSON.stringify({
          contents: [
            ...history.map((item) => ({
              parts: [{ text: item.text }],
              role: item.role === "assistant" ? "model" : "user",
            })),
            { parts: [{ text: message }], role: "user" },
          ],
          generationConfig: {
            maxOutputTokens: 320,
            temperature: 0.3,
            ...(model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : {}),
          },
          systemInstruction: {
            parts: [{ text: buildMiaubySystemPrompt(products) }],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini respondeu ${response.status}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const reply = cleanMiaubyReply(
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join(" ") ?? "",
    );

    return json({
      message: reply || miaubyFallbackReply(message, replyProducts),
      products: replyProducts,
      source: reply ? "gemini" : "fallback",
    });
  } catch (error) {
    console.error("Erro no Miauby Gemini", error);

    return json({
      message: miaubyFallbackReply(message, replyProducts),
      products: replyProducts,
      source: "fallback",
    });
  }
}
