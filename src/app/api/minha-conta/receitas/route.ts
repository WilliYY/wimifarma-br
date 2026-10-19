import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { getPrisma } from "@/lib/prisma";
import { readLimitedBody, RequestBodyError } from "@/lib/api";
import { limitPaymentRequest } from "@/features/payments/http";
import { PaymentError } from "@/features/payments/schema";
import { prescriptionCartSchema, preparePrescriptionBytes, reservePrescriptionUpload, savePrescriptionUpload } from "@/features/orders/prescription-service";
import { PRESCRIPTION_MAX_BYTES, PrescriptionError } from "@/features/orders/prescription-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(process.env.AUTH_URL || request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new PrescriptionError("Origem inválida.", 403);
    const customerId = sessionCustomerId(await auth());
    if (!customerId) throw new PrescriptionError("Entre na sua conta para enviar a receita.", 401);
    limitPaymentRequest(request, "prescription-upload", 10);
    const submissionId = z.string().uuid().safeParse(request.headers.get("x-checkout-request-id"));
    const cartHeader = request.headers.get("x-prescription-cart");
    if (!submissionId.success || !cartHeader || cartHeader.length > 5000) throw new PrescriptionError("Revise o carrinho.");
    let cart: unknown;
    try { cart = JSON.parse(cartHeader); } catch { throw new PrescriptionError("Revise o carrinho."); }
    const items = prescriptionCartSchema.safeParse(cart);
    if (!items.success) throw new PrescriptionError("Revise o carrinho.");
    const db = getPrisma();
    // Commit quota before reading/decoding so failed uploads also consume a persisted attempt.
    await db.$transaction(tx => reservePrescriptionUpload(tx, customerId));
    const bytes = await readLimitedBody(request, { maxBytes: PRESCRIPTION_MAX_BYTES });
    const prepared = await preparePrescriptionBytes(bytes, request.headers.get("content-type") || "");
    const data = await db.$transaction(tx => savePrescriptionUpload(tx, { customerId, submissionId: submissionId.data, items: items.data, bytes: prepared.bytes, mimeType: prepared.mimeType }));
    return NextResponse.json({ data }, { status: 201, headers });
  } catch (error) {
    const known = error instanceof PrescriptionError || error instanceof RequestBodyError || error instanceof PaymentError;
    return NextResponse.json({ error: known ? error.message : "Não foi possível enviar a receita. Tente novamente." }, { status: known ? error.status : 503, headers });
  }
}
