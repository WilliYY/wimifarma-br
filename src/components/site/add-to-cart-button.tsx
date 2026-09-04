"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { useCart, type CartProduct } from "@/components/site/cart-provider";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function AddToCartButton({
  className,
  product,
}: {
  className: string;
  product: CartProduct;
}) {
  const router = useRouter();
  const { addProduct } = useCart();
  const requiresAssistance = product.requiresPrescription || product.isPopularPharmacy;

  if (requiresAssistance) {
    return (
      <a
        className={className}
        href={buildWhatsAppUrl(
          `Ola, gostaria de consultar ${product.name} e confirmar os documentos necessarios.`,
        )}
        rel="noreferrer"
        target="_blank"
      >
        <MessageCircle className="h-4 w-4" />
        Consultar produto
      </a>
    );
  }

  if (product.stock < 1) {
    return (
      <button className={`${className} cursor-not-allowed opacity-55`} disabled type="button">
        Produto indisponivel
      </button>
    );
  }

  return (
    <button
      className={className}
      onClick={() => {
        addProduct(product);
        router.push("/carrinho");
      }}
      type="button"
    >
      <ShoppingCart className="h-4 w-4" />
      Comprar
    </button>
  );
}
