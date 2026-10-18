import { requireAdminApi } from "@/features/auth/permissions";
import { privateSupplierImageHeaders, servePrivateSupplierImage } from "@/features/product-images/private-supplier-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const guard = await requireAdminApi();
  if (guard.response) return new Response(null, { status: guard.response.status, headers: privateSupplierImageHeaders });
  try { return await servePrivateSupplierImage((await params).fileName); }
  catch { return new Response(null, { status: 503, headers: privateSupplierImageHeaders }); }
}
