import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} e obrigatorio.`).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const digits = (value: string) => value.replace(/\D/g, "");

const addressSchema = z.object({
  postalCode: requiredText("CEP", 10).transform(digits).pipe(z.string().length(8, "Informe um CEP valido.")),
  street: requiredText("Endereco", 120),
  number: requiredText("Numero", 20),
  complement: optionalText(80),
  neighborhood: requiredText("Bairro", 80),
  city: requiredText("Cidade", 80),
  state: requiredText("Estado", 2).transform((value) => value.toUpperCase()),
});

export const checkoutRequestSchema = z
  .object({
    customer: z.object({
      name: requiredText("Nome", 120),
      phone: requiredText("Telefone", 20)
        .transform(digits)
        .pipe(z.string().min(10, "Informe um telefone valido.").max(11, "Informe um telefone valido.")),
      email: z
        .union([z.literal(""), z.string().trim().email("Informe um e-mail valido.").max(160)])
        .optional()
        .transform((value) => value || undefined),
    }),
    fulfillmentMethod: z.enum(["DELIVERY", "PICKUP"]),
    paymentMethod: z.enum(["PIX", "CARD_ON_DELIVERY", "CASH"]),
    address: addressSchema.optional(),
    notes: optionalText(500),
    privacyConsent: z.literal(true),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1).max(64),
          quantity: z.coerce.number().int().min(1).max(20),
          expectedUnitPriceCents: z.coerce.number().int().positive().max(1_000_000),
        }),
      )
      .min(1, "O carrinho esta vazio.")
      .max(30, "O carrinho aceita ate 30 produtos diferentes."),
  })
  .superRefine((data, context) => {
    if (data.fulfillmentMethod === "DELIVERY") {
      if (!data.address) {
        context.addIssue({
          code: "custom",
          path: ["address"],
          message: "Informe o endereco para entrega.",
        });
      } else if (
        normalizeText(data.address.city) !== "ivate" ||
        data.address.state !== "PR"
      ) {
        context.addIssue({
          code: "custom",
          path: ["address", "city"],
          message: "Nesta etapa, a entrega esta disponivel somente em Ivate-PR.",
        });
      }
    }

    const productIds = new Set<string>();
    for (const [index, item] of data.items.entries()) {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "productId"],
          message: "Produto repetido no carrinho.",
        });
      }
      productIds.add(item.productId);
    }
  });

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const orderStatusUpdateSchema = z
  .object({
    status: z
      .enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"])
      .optional(),
    paymentStatus: z.enum(["PENDING", "PAID", "CANCELED", "REFUNDED"]).optional(),
  })
  .refine((data) => data.status || data.paymentStatus, {
    message: "Informe o status que deve ser atualizado.",
  });

export const orderStatusTransitions = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "OUT_FOR_DELIVERY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
} as const;

export const paymentStatusTransitions = {
  PENDING: ["PAID", "CANCELED"],
  PAID: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: [],
} as const;

export function canTransitionStatus<TCurrent extends keyof typeof orderStatusTransitions>(
  transitions: typeof orderStatusTransitions,
  current: TCurrent,
  next: string,
): boolean;
export function canTransitionStatus<TCurrent extends keyof typeof paymentStatusTransitions>(
  transitions: typeof paymentStatusTransitions,
  current: TCurrent,
  next: string,
): boolean;
export function canTransitionStatus(
  transitions: Record<string, readonly string[]>,
  current: string,
  next: string,
) {
  return current === next || Boolean(transitions[current]?.includes(next));
}

export type CheckoutProductRecord = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: string | number;
  promotionalPrice: string | number | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  stock: number;
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
};

export type PreparedOrderItem = {
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
};

export type CheckoutPreparation =
  | {
      ok: true;
      items: PreparedOrderItem[];
      subtotalCents: number;
      deliveryFeeCents: number;
      totalCents: number;
    }
  | {
      ok: false;
      code: "NOT_FOUND" | "UNAVAILABLE" | "RESTRICTED" | "OUT_OF_STOCK" | "PRICE_CHANGED";
      message: string;
    };

export function prepareCheckoutOrder(
  products: CheckoutProductRecord[],
  requestedItems: CheckoutRequest["items"],
): CheckoutPreparation {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const items: PreparedOrderItem[] = [];

  for (const requestedItem of requestedItems) {
    const product = productsById.get(requestedItem.productId);

    if (!product) {
      return { ok: false, code: "NOT_FOUND", message: "Um produto do carrinho nao foi encontrado." };
    }
    if (product.status !== "ACTIVE") {
      return { ok: false, code: "UNAVAILABLE", message: `${product.name} nao esta disponivel para compra.` };
    }
    if (product.requiresPrescription || product.isPopularPharmacy) {
      return {
        ok: false,
        code: "RESTRICTED",
        message: `${product.name} precisa de atendimento da farmacia antes do pedido.`,
      };
    }
    if (product.stock < requestedItem.quantity) {
      return {
        ok: false,
        code: "OUT_OF_STOCK",
        message: `Estoque insuficiente para ${product.name}.`,
      };
    }

    const unitPriceCents = moneyToCents(product.promotionalPrice ?? product.price);
    if (unitPriceCents !== requestedItem.expectedUnitPriceCents) {
      return {
        ok: false,
        code: "PRICE_CHANGED",
        message: `O preco de ${product.name} mudou. Atualize o carrinho para continuar.`,
      };
    }

    items.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImageUrl: product.imageUrl,
      unitPriceCents,
      quantity: requestedItem.quantity,
      totalCents: unitPriceCents * requestedItem.quantity,
    });
  }

  const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);

  return {
    ok: true,
    items,
    subtotalCents,
    deliveryFeeCents: 0,
    totalCents: subtotalCents,
  };
}

export function moneyToCents(value: string | number) {
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error("Valor monetario invalido.");
  }
  return cents;
}

export function createOrderNumber(now = new Date(), random = crypto.randomUUID()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = random.replaceAll("-", "").slice(0, 8).toUpperCase();
  return `WIM-${date}-${suffix}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
