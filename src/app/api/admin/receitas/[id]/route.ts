import { auth } from "@/features/auth/auth";
import { getPrisma } from "@/lib/prisma";
import { decryptPrescription } from "@/features/orders/prescription-upload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'none'", "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex, nofollow" };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ error: "Entre na sua conta." }, { status: 401, headers });
    if (session.user.role !== "ADMIN") return Response.json({ error: "Acesso restrito." }, { status: 403, headers });
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Receita não localizada." }, { status: 404, headers });
    const file = await getPrisma().$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${session.user.id} FOR UPDATE`;
      if (!await tx.user.findFirst({ where: { id: session.user.id, role: "ADMIN", isActive: true }, select: { id: true } })) return null;
      const upload = await tx.prescriptionUpload.findFirst({ where: { id, orderId: { not: null } } });
      if (!upload) return null;
      const bytes = decryptPrescription(upload, id);
      await tx.auditLog.create({ data: { userId: session.user.id, action: "PRESCRIPTION_DOWNLOADED", entity: "PrescriptionUpload", entityId: id } });
      return { bytes, mimeType: upload.mimeType };
    });
    if (!file) return Response.json({ error: "Receita não localizada ou acesso revogado." }, { status: 404, headers });
    const extension = file.mimeType === "application/pdf" ? "pdf" : "png";
    return new Response(new Uint8Array(file.bytes), { headers: { ...headers, "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="receita.${extension}"` } });
  } catch {
    return Response.json({ error: "Não foi possível acessar a receita." }, { status: 503, headers });
  }
}
