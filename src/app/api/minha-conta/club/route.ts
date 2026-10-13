import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { getClubSummary, joinClub, resolveClubCustomer } from "@/features/club/service";
import { ClubRuleError } from "@/features/club/wallet";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const joinSchema = z.object({ join: z.literal(true) }).strict();

function failure(error: unknown) {
  const status = error instanceof ClubRuleError || error instanceof RequestBodyError ? error.status : 503;
  const message = error instanceof ClubRuleError ? error.message : "Não foi possível consultar o Club. Tente novamente.";
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET() {
  try {
    const session = await auth();
    const data = await getPrisma().$transaction(async tx => getClubSummary(tx, await resolveClubCustomer(tx, session)), { isolationLevel: "RepeatableRead" });
    return NextResponse.json({ data }, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new ClubRuleError("Entre na sua conta.", 401);
    // Middleware aplica a mesma proteção de origem e limite das demais APIs privadas.
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || new URL(request.url).host;
    if (origin) {
      try { if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) throw new Error(); }
      catch { throw new ClubRuleError("Solicitação não autorizada.", 403); }
    }
    if (request.headers.get("sec-fetch-site") === "cross-site") throw new ClubRuleError("Solicitação não autorizada.", 403);
    const bytes = await readLimitedBody(request, { maxBytes: 1024 });
    let input: unknown;
    try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ClubRuleError("Adesão inválida.", 422); }
    if (!joinSchema.safeParse(input).success) throw new ClubRuleError("Adesão inválida.", 422);
    const data = await getPrisma().$transaction(tx => joinClub(tx, session));
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    // Uma disputa pelo e-mail não autoriza mesclar identidades.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return failure(new ClubRuleError("Não foi possível vincular esta conta. Contate a administração.", 409));
    return failure(error);
  }
}
