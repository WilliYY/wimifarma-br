import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { proposeItemShortage } from "@/features/orders/item-shortage-service";
import { ItemShortageError } from "@/features/orders/item-shortage-rules";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const schema = z.object({ orderItemId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(10000), expectedUpdatedAt: z.string().datetime() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") throw new ItemShortageError("Não autorizado.", 403);
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ItemShortageError("Solicitação não autorizada.", 403);
    const bytes = await readLimitedBody(request, { maxBytes: 1024 });
    let body: unknown;
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ItemShortageError("Solicitação inválida.", 422); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ItemShortageError("Solicitação inválida.", 422);
    const { id } = await params;
    const data = await getPrisma().$transaction(tx => proposeItemShortage(tx, { ...parsed.data, orderId: id, actorId: session.user.id }));
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    const status = error instanceof ItemShortageError || error instanceof RequestBodyError ? error.status : 503;
    return NextResponse.json({ error: error instanceof ItemShortageError ? error.message : "Não foi possível registrar a falta. Tente novamente." }, { status, headers });
  }
}
