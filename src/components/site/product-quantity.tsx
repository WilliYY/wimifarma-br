"use client";

import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export const ProductQuantityContext = createContext<{
  quantity: number;
  setQuantity: Dispatch<SetStateAction<number>>;
} | null>(null);

export function ProductQuantityProvider({ children }: { children: ReactNode }) {
  const [quantity, setQuantity] = useState(1);
  return <ProductQuantityContext.Provider value={{ quantity, setQuantity }}>{children}</ProductQuantityContext.Provider>;
}
