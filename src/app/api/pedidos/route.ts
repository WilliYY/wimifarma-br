import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth";
import {
  checkoutRequestSchema,
  createOrderNumber,
  prepareCheckoutOrder,
} from "@/features/orders/checkout";
import { readJsonBody } from "@/lib/api";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = checkoutRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise os dados do checkout.", fields: parsed.error.flatten() },
      { headers: { "Cache-Control": "no-store" }, status: 422 },
    );
  }

  const prisma = getPrisma();
  const products = await prisma.product.findMany({
    select: {
      id: true,
      imageUrl: true,
      isPopularPharmacy: true,
      name: true,
      price: true,
      promotionalPrice: true,
      requiresPrescription: true,
      slug: true,
      status: true,
      stock: true,
    },
    where: { id: { in: parsed.data.items.map((item) => item.productId) } },
  });

  const prepared = prepareCheckoutOrder(
    products.map((product) => ({
      ...product,
      price: product.price.toString(),
      promotionalPrice: product.promotionalPrice?.toString() ?? null,
    })),
    parsed.data.items,
  );

  if (!prepared.ok) {
    return NextResponse.json(
      { code: prepared.code, error: prepared.message },
      {
        headers: { "Cache-Control": "no-store" },
        status: prepared.code === "NOT_FOUND" ? 404 : 409,
      },
    );
  }

  const session = await auth();
  const sessionCustomerId =
    session?.user?.role === "CUSTOMER" && session.user.id
      ? session.user.id
      : undefined;
  const customer = sessionCustomerId
    ? await prisma.customer.findUnique({
        select: { id: true },
        where: { id: sessionCustomerId },
      })
    : null;
  const address =
    parsed.data.fulfillmentMethod === "DELIVERY" ? parsed.data.address : undefined;

  const order = await prisma.order.create({
    data: {
      addressNumber: address?.number,
      city: address?.city,
      complement: address?.complement,
      customerEmail: parsed.data.customer.email,
      customerId: customer?.id,
      customerName: parsed.data.customer.name,
      customerPhone: parsed.data.customer.phone,
      deliveryFeeCents: prepared.deliveryFeeCents,
      fulfillmentMethod: parsed.data.fulfillmentMethod,
      items: {
        create: prepared.items.map((item) => ({
          productId: item.productId,
          productImageUrl: item.productImageUrl,
          productName: item.productName,
          productSlug: item.productSlug,
          quantity: item.quantity,
          totalCents: item.totalCents,
          unitPriceCents: item.unitPriceCents,
        })),
      },
      neighborhood: address?.neighborhood,
      notes: parsed.data.notes,
      number: createOrderNumber(),
      paymentMethod: parsed.data.paymentMethod,
      postalCode: address?.postalCode,
      privacyConsentAt: new Date(),
      state: address?.state,
      street: address?.street,
      subtotalCents: prepared.subtotalCents,
      totalCents: prepared.totalCents,
    },
    select: {
      createdAt: true,
      fulfillmentMethod: true,
      number: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
      totalCents: true,
    },
  });

  return NextResponse.json(
    {
      data: {
        ...order,
        createdAt: order.createdAt.toISOString(),
      },
      message: "Pedido recebido e aguardando confirmacao da farmacia.",
    },
    { headers: { "Cache-Control": "no-store" }, status: 201 },
  );
}
