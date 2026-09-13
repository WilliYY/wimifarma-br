"use client";

import { useState } from "react";
import { CartProvider } from "@/components/site/cart-provider";
import { CartHeaderButton } from "@/components/site/cart-header-button";
import { PublicProductCard, type RelatedProductCardItem } from "@/components/site/public-product-card";
import { CheckoutPage } from "@/components/site/checkout-page";
import { HomePage } from "@/components/site/home-page";

const product: RelatedProductCardItem = { id: "qa-product", slug: "qa-product", name: "Produto de teste com nome longo para conferencia do layout", price: "20.00", promotionalPrice: "18.00", imageUrl: "/favicon.svg", brand: "Wimifarma", category: "Cuidados pessoais", requiresPrescription: false, isPopularPharmacy: false, stock: 3, activeIngredients: [], searchTerms: [], cashbackEnabled: true, cashbackRateBps: 200 };

export default function Page() {
  const [checkout, setCheckout] = useState(false);
  return <CartProvider><div className="flex h-16 items-center justify-between border-b border-line bg-white px-5"><button onClick={() => setCheckout((value) => !value)} type="button">{checkout ? "Catalogo teste" : "Checkout teste"}</button><CartHeaderButton /></div>{checkout ? <CheckoutPage initialCustomer={{ name: "", phone: "", email: "", street: "", neighborhood: "" }} /> : <><div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"><PublicProductCard product={product} /><PublicProductCard product={{ ...product, id: "qa-empty", slug: "qa-empty", stock: 0, name: "Sem estoque" }} /><PublicProductCard product={{ ...product, id: "qa-restricted", requiresPrescription: true, name: "Atendimento com receita" }} /></div><HomePage catalogProducts={[product]} customerReviews={[]} featuredProducts={Array.from({ length: 10 }, (_, index) => ({ ...product, id: `offer-${index}`, slug: `offer-${index}`, name: `Oferta teste ${index}`, featuredPosition: index + 1, imageUrl: "/favicon.svg", description: null, ratingAverage: null, ratingCount: 0 }))} /></>}</CartProvider>;
}
