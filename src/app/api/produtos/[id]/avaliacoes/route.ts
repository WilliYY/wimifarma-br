import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import { productReviewInputSchema } from "@/features/products/product-detail";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json(
      { message: "Entre na sua conta de cliente para avaliar." },
      { status: 401 },
    );
  }

  const body = await readJsonBody(request);
  const parsed = productReviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { id: productId } = await params;
  const prisma = getPrisma();
  const product = await prisma.product.findFirst({
    select: { id: true },
    where: { id: productId, status: "ACTIVE" },
  });
  if (!product) {
    return NextResponse.json({ message: "Produto nao encontrado." }, { status: 404 });
  }

  const completedOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
    where: {
      customerId: session.user.id,
      items: { some: { productId } },
      status: "COMPLETED",
    },
  });
  if (!completedOrder) {
    return NextResponse.json(
      { message: "A avaliacao fica disponivel depois que uma compra deste produto for concluida." },
      { status: 403 },
    );
  }

  const review = await prisma.productReview.upsert({
    create: {
      comment: parsed.data.comment,
      customerId: session.user.id,
      orderId: completedOrder.id,
      productId,
      rating: parsed.data.rating,
    },
    select: { createdAt: true, id: true, rating: true, updatedAt: true },
    update: {
      comment: parsed.data.comment,
      isPublished: true,
      orderId: completedOrder.id,
      rating: parsed.data.rating,
    },
    where: { productId_customerId: { customerId: session.user.id, productId } },
  });

  return NextResponse.json({ data: review }, { status: 201 });
}
