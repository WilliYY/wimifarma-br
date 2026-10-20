import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { decideItemShortage } from "@/features/orders/item-shortage-service";
import { ItemShortageError } from "@/features/orders/item-shortage-rules";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const schema = z.object({ shortageId: z.string().min(1).max(100), version: z.number().int().positive(), decision: z.enum(["ACCEPT_CREDIT", "REQUEST_REFUND"]), consent: z.boolean().optional() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const customerId = sessionCustomerId(session);
    if (!session?.user?.id || !customerId) throw new ItemShortageError("Entre na sua conta.", 401);
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ItemShortageError("Solicitação não autorizada.", 403);
    const bytes = await readLimitedBody(request, { maxBytes: 1024 });
    let body: unknown;
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ItemShortageError("Solicitação inválida.", 422); }
    const parsed = schema.safeParse(body);
    if (!parsed.success || (parsed.data.decision === "ACCEPT_CREDIT" && parsed.data.consent !== true)) throw new ItemShortageError("Solicitação inválida.", 422);
    const { id } = await params;
    const data = await getPrisma().$transaction(tx => decideItemShortage(tx, { ...parsed.data, orderId: id, customerId }));
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    const status = error instanceof ItemShortageError || error instanceof RequestBodyError ? error.status : 503;
    return NextResponse.json({ error: error instanceof ItemShortageError ? error.message : "Não foi possível registrar sua escolha. Tente novamente." }, { status, headers });
  }
}
