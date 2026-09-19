import { serveProductImage } from "@/features/product-images/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  return serveProductImage(request, (await params).fileName);
}
