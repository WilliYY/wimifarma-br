import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "wimifarma-br",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
