import { after, NextResponse } from "next/server";
import { passwordRecoveryRequestSchema, requestPasswordRecovery } from "@/features/auth/password-recovery";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = passwordRecoveryRequestSchema.safeParse(await readJsonBody(request));
  if (parsed.success) {
    // Provider and database latency must not disclose whether the account is eligible.
    after(async () => {
      try { await requestPasswordRecovery(parsed.data.email); }
      catch { /* The request response is deliberately independent of delivery and infrastructure. */ }
    });
  }
  return NextResponse.json(
    { message: "Se o e-mail estiver habilitado para recuperação, enviaremos as instruções." },
    { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } },
  );
}
