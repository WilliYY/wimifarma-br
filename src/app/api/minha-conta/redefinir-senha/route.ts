import { NextResponse } from "next/server";
import { passwordRecoveryResetSchema, resetCustomerPassword } from "@/features/auth/password-recovery";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const parsed = passwordRecoveryResetSchema.safeParse(await readJsonBody(request));
  try {
    if (parsed.success && await resetCustomerPassword(parsed.data)) {
      return NextResponse.json({ message: "Senha redefinida. Entre com a nova senha." }, { headers });
    }
  } catch { /* Fail closed without returning credential or infrastructure details. */ }
  return NextResponse.json({ message: "Não foi possível redefinir a senha. O link pode ser inválido ou ter expirado." }, { status: 400, headers });
}
