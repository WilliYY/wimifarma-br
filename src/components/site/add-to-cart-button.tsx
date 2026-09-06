"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { useCart, type CartProduct } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function AddToCartButton({
  className,
  iconOnly = false,
  product,
}: {
  className: string;
  iconOnly?: boolean;
  product: CartProduct;
}) {
  const router = useRouter();
  const { addProduct } = useCart();
  const requiresAssistance = product.requiresPrescription || product.isPopularPharmacy;

  if (requiresAssistance) {
    return (
      <a
        aria-label={`Consultar ${product.name} pelo WhatsApp`}
        className={className}
        href={buildWhatsAppUrl(
          `Ola, gostaria de consultar ${product.name} e confirmar os documentos necessarios.`,
        )}
        rel="noreferrer"
        target="_blank"
        title={`Consultar ${product.name}`}
      >
        <MessageCircle className="h-4 w-4" />
        {iconOnly ? null : "Consultar produto"}
      </a>
    );
  }

  if (product.stock < 1) {
    return (
      <button
        aria-label={`${product.name} indisponivel`}
        className={`${className} cursor-not-allowed opacity-55`}
        disabled
        title="Produto indisponivel"
        type="button"
      >
        {iconOnly ? <ShoppingCart className="h-4 w-4" /> : "Produto indisponivel"}
      </button>
    );
  }

  return (
    <button
      aria-label={`Comprar ${product.name}`}
      className={className}
      onClick={() => {
        addProduct(product);
        router.push("/carrinho");
      }}
      title={`Comprar ${product.name}`}
      type="button"
    >
      <ShoppingCart className="h-4 w-4" />
      {iconOnly ? null : "Comprar"}
    </button>
  );
}
