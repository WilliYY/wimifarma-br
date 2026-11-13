import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { cartReminderRequestSchema, getCartEmailReminderStatus, updateCartEmailReminder } from "@/features/communications/cart-email-reminder";
import { cartEmailReminderOwner } from "@/features/communications/cart-email-reminder-owner";
import { readLimitedBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

async function customerId(request: Request) {
  const session = await auth();
  if (session?.user.role !== "CUSTOMER" || !session.user.id) return null;
  return request.headers.get("x-cart-reminder-owner") === cartEmailReminderOwner(session.user.id) ? sessionCustomerId(session) : null;
}

export async function GET(request: Request) {
  try {
    const id = await customerId(request);
    if (!id) return NextResponse.json({ eligible: false, cartKey: null }, { status: 401, headers });
    return NextResponse.json(await getCartEmailReminderStatus(id), { headers });
  } catch { return NextResponse.json({ eligible: false, cartKey: null }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  try {
    const id = await customerId(request);
    if (!id) return NextResponse.json({ cartKey: null }, { status: 401, headers });
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, { maxBytes: 4096 })));
    } catch { return NextResponse.json({ cartKey: null }, { status: 400, headers }); }
    const parsed = cartReminderRequestSchema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ cartKey: null }, { status: 400, headers });
    return NextResponse.json(await updateCartEmailReminder(id, parsed.data), { headers });
  } catch { return NextResponse.json({ cartKey: null }, { status: 503, headers }); }
}
