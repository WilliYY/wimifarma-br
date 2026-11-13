import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { sessionCustomerId } from "@/features/auth/customer-session";
import { passwordRecoveryVerificationSchema, verifyPasswordRecoveryEmail } from "@/features/auth/password-recovery";
import { readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  try {
    const session = await auth();
    const customerId = session?.user.role === "CUSTOMER" ? sessionCustomerId(session) : null;
    if (!customerId) return NextResponse.json({ message: "Entre na conta de cliente para confirmar seu e-mail." }, { status: 401, headers });

    const parsed = passwordRecoveryVerificationSchema.safeParse(await readJsonBody(request));
    if (parsed.success) {
      const result = await verifyPasswordRecoveryEmail(customerId, parsed.data);
      if (result === "verified") return NextResponse.json({ message: "E-mail confirmado para recuperação de senha.", verified: true }, { headers });
      if (result === "requested") return NextResponse.json({ message: "Se a confirmação estiver disponível, enviaremos o código ao e-mail da sua conta." }, { headers });
    }
  } catch { /* Fail closed without returning credential or infrastructure details. */ }
  return NextResponse.json({ message: "Não foi possível confirmar o e-mail. Confira a senha e o código, se houver." }, { status: 400, headers });
}
