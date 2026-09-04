"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "wimifarma-cart-v1";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  unitPriceCents: number;
  originalPriceCents: number | null;
  stock: number;
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
};

export type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  hydrated: boolean;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addProduct: (product: CartProduct) => void;
  clearCart: () => void;
  removeProduct: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter(isCartItem).slice(0, 30));
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addProduct = useCallback((product: CartProduct) => {
    if (
      product.stock < 1 ||
      product.requiresPrescription ||
      product.isPopularPharmacy
    ) {
      return;
    }

    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (!existing) return [...current, { ...product, quantity: 1 }];
      return current.map((item) =>
        item.id === product.id
          ? { ...item, ...product, quantity: Math.min(item.quantity + 1, product.stock, 20) }
          : item,
      );
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.min(Math.max(Math.trunc(quantity), 0), item.stock, 20) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotalCents = items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      addProduct,
      clearCart,
      hydrated,
      itemCount,
      items,
      removeProduct,
      subtotalCents,
      updateQuantity,
    }),
    [addProduct, clearCart, hydrated, itemCount, items, removeProduct, subtotalCents, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider.");
  return context;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    (typeof item.imageUrl === "string" || item.imageUrl === null) &&
    (typeof item.category === "string" || item.category === null) &&
    Number.isSafeInteger(item.unitPriceCents) &&
    Number(item.unitPriceCents) > 0 &&
    (Number.isSafeInteger(item.originalPriceCents) || item.originalPriceCents === null) &&
    Number.isSafeInteger(item.stock) &&
    Number(item.stock) > 0 &&
    typeof item.requiresPrescription === "boolean" &&
    typeof item.isPopularPharmacy === "boolean" &&
    Number.isSafeInteger(item.quantity) &&
    Number(item.quantity) > 0 &&
    Number(item.quantity) <= Math.min(Number(item.stock), 20)
  );
}
