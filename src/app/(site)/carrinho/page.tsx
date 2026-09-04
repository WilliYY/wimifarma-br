import type { Metadata } from "next";
import { CartPage } from "@/components/site/cart-page";

export const metadata: Metadata = {
  title: "Carrinho | Wimifarma",
  robots: { follow: false, index: false },
};

export default function Page() {
  return <CartPage />;
}
