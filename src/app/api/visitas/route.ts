import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return cleanText(forwardedFor?.split(",")[0] ?? realIp ?? "", 80);
}

function hashIp(ip: string) {
  if (!ip) {
    return null;
  }

  const salt = process.env.VISIT_HASH_SALT || process.env.AUTH_SECRET || "wimifarma";

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const sessionId = cleanText(body?.sessionId, 80);

  if (!sessionId || sessionId.length < 12) {
    return NextResponse.json(
      { message: "Sessao invalida para registrar visita." },
      { status: 400 },
    );
  }

  const path = cleanText(body?.path, 240) || "/";
  const referrer = cleanText(body?.referrer, 240) || null;
  const userAgent = cleanText(request.headers.get("user-agent"), 300) || null;
  const ipHash = hashIp(getClientIp(request));
  const prisma = getPrisma();

  await prisma.siteVisit.upsert({
    create: {
      firstPath: path,
      ipHash,
      lastPath: path,
      referrer,
      sessionId,
      userAgent,
    },
    update: {
      lastPath: path,
      lastSeenAt: new Date(),
      views: { increment: 1 },
    },
    where: { sessionId },
  });

  return NextResponse.json({ ok: true });
}
