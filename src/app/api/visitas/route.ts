import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readVisitorId, signVisitorId, validVisitorId, VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE } from "@/features/analytics/visitor-identity";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

function cleanPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value.split(/[?#]/)[0].slice(0, 240);
}

function cleanReferrer(value: unknown) {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const siteUrl = process.env.AUTH_URL || request.url;
  if (request.headers.get("origin") !== new URL(siteUrl).origin) {
    return NextResponse.json({ message: "Origem invalida para registrar visita." }, { status: 403 });
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ message: "Registro de visitas indisponivel." }, { status: 503 });

  const payload = await readJsonBody(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ message: "Visita invalida." }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;
  if (body.type !== undefined && body.type !== "view" && body.type !== "heartbeat") {
    return NextResponse.json({ message: "Tipo de visita invalido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const cookieId = readVisitorId(request.cookies.get(VISITOR_COOKIE)?.value, secret);
  if (body.type === "heartbeat") {
    // Presence only renews an existing, signed identity; it never creates visitors or page views.
    if (!cookieId) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    try {
      const now = new Date();
      await getPrisma().siteVisit.updateMany({
        where: { sessionId: cookieId, lastSeenAt: { lte: new Date(now.getTime() - 20_000) } },
        data: { lastSeenAt: now },
      });
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ message: "Registro de visitas indisponivel." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }
  if (!cookieId && body.sessionId != null && !validVisitorId(body.sessionId)) {
    return NextResponse.json(
      { message: "Sessao invalida para registrar visita." },
      { status: 400 },
    );
  }

  // Preserve identifiers already stored by the previous tracker, including legacy IDs.
  const sessionId = cookieId || (validVisitorId(body.sessionId) ? body.sessionId : randomUUID());
  const path = cleanPath(body.path);
  try {
    await getPrisma().siteVisit.upsert({
      create: {
        firstPath: path,
        lastPath: path,
        referrer: cleanReferrer(body.referrer),
        sessionId,
      },
      update: {
        lastPath: path,
        lastSeenAt: new Date(),
        views: { increment: 1 },
      },
      where: { sessionId },
    });
  } catch {
    return NextResponse.json({ message: "Registro de visitas indisponivel." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.json({ ok: true, visitorId: sessionId });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(VISITOR_COOKIE, signVisitorId(sessionId, secret), {
    httpOnly: true,
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: new URL(siteUrl).protocol === "https:",
  });
  return response;
}
