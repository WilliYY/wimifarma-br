import { handlers } from "@/features/auth/auth";
import { NextRequest, NextResponse } from "next/server";
import { readLimitedBody, RequestBodyError } from "@/lib/api";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  let bytes: Uint8Array<ArrayBuffer>;
  try { bytes = await readLimitedBody(request, { maxBytes: 64_000 }); }
  catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : "Solicitação inválida." }, { status: error instanceof RequestBodyError ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
  const headers = new Headers(request.headers);
  headers.delete("transfer-encoding");
  headers.set("content-length", String(bytes.byteLength));
  // Preserve raw form/JSON bytes, cookies and NextRequest.nextUrl used by Auth.js.
  return handlers.POST(new NextRequest(request.url, { method: "POST", headers, body: bytes, signal: request.signal }));
}
