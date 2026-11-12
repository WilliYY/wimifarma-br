"use client";

import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export function productQuantityUnits(saleUnitLabel: string | null) {
  const unit = saleUnitLabel?.split(" ")[1];
  switch (unit) {
    case "caixa": return { singular: "caixa", plural: "caixas" };
    case "kit": return { singular: "kit", plural: "kits" };
    case "pacote": return { singular: "pacote", plural: "pacotes" };
    default: return { singular: "unidade", plural: "unidades" };
  }
}

export const ProductQuantityContext = createContext<{
  quantity: number;
  setQuantity: Dispatch<SetStateAction<number>>;
} | null>(null);

export function ProductQuantityProvider({ children }: { children: ReactNode }) {
  const [quantity, setQuantity] = useState(1);
  return <ProductQuantityContext.Provider value={{ quantity, setQuantity }}>{children}</ProductQuantityContext.Provider>;
}
