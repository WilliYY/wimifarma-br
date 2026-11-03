"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { requiresPurchaseAssistance, type PrescriptionType } from "@/features/products/purchase-policy";
import { publicProductImageUrl } from "@/features/product-images/private-supplier-policy";
import { type CartReviewProposal } from "@/features/products/cart-review";
import { toast } from "sonner";
import { CartStorage, CART_LEGACY_KEY, CART_OPERATION_PREFIX, CART_BASE_PREFIX, type CartOperation } from "./cart-storage";

export type CartProduct = {
  supplierDemandAllowed?: boolean;
  inventorySource?: "PHARMACY" | "DISTRIBUTOR";
  catalogClassification?: unknown;
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  unitPriceCents: number;
  originalPriceCents: number | null;
  stock: number;
  requiresPrescription: boolean;
  prescriptionType?: PrescriptionType;
  isPopularPharmacy: boolean;
};

export type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  hydrated: boolean;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addProduct: (product: CartProduct, quantity?: number) => void;
  clearCart: () => void;
  removeProduct: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyCartReview: (proposal: CartReviewProposal) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const notifiedCart = useRef<string | null>(null);
  const cartNoticeQueue = useRef<Promise<void>>(Promise.resolve());

  const cartStorage = useRef<CartStorage | null>(null);
  const storageWarning = useRef(false);
  const publish = useCallback((next: CartItem[]) => {
    setItems(current => current === next ? current : next);
  }, []);

  useEffect(() => {
    // Resolve localStorage lazily: its getter can throw in private/restricted contexts.
    const storage: Storage = {
      get length() { return window.localStorage.length; },
      key: index => window.localStorage.key(index),
      getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: key => window.localStorage.removeItem(key),
      clear: () => window.localStorage.clear(),
    };
    const store = new CartStorage(storage, () => {
      if (storageWarning.current) return;
      storageWarning.current = true;
      toast.warning("O navegador não conseguiu salvar ou limpar os dados da cesta. Mantenha esta aba aberta; as outras abas podem não receber as alterações.");
    });
    cartStorage.current = store;
    publish(store.read());
    setHydrated(true);
    const refresh = () => publish(store.read());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CART_LEGACY_KEY || event.key?.startsWith(CART_OPERATION_PREFIX) || event.key?.startsWith(CART_BASE_PREFIX)) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [publish]);

  const commit = useCallback((operation: CartOperation) => {
    if (cartStorage.current) publish(cartStorage.current.commit(operation));
  }, [publish]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({ items: items.map(item => ({ productId: item.id, quantity: item.quantity })) });
    if (notifiedCart.current === payload) return;
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const attempt = (canRetry: boolean) => {
      // An in-flight update invalidates the last snapshot, including an empty one.
      notifiedCart.current = null;
      cartNoticeQueue.current = cartNoticeQueue.current.then(async () => {
        if (!active) return;
        try {
          const response = await fetch("/api/miauby/carrinho", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
          if (response.ok && active) notifiedCart.current = payload;
          else if (active && canRetry && [429, 503].includes(response.status)) retry = setTimeout(() => attempt(false), 60_000);
        } catch { /* An alert must never interrupt shopping. */ }
      });
    };
    const timer = setTimeout(() => attempt(true), items.length ? 30_000 : 0);
    // Serialize requests so clearing waits for the initial signed cookie to arrive.
    return () => { active = false; clearTimeout(timer); if (retry) clearTimeout(retry); };
  }, [hydrated, items]);

  const addProduct = useCallback((product: CartProduct, quantity = 1) => {
    if (
      !Number.isFinite(quantity) || product.stock < 1 ||
      requiresPurchaseAssistance(product)
    ) {
      return;
    }

    commit({ type: "add", product: { ...product, imageUrl: publicProductImageUrl(product) }, quantity });
  }, [commit]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (Number.isFinite(quantity)) commit({ type: "quantity", productId, quantity });
  }, [commit]);
  const removeProduct = useCallback((productId: string) => commit({ type: "remove", productId }), [commit]);
  const clearCart = useCallback(() => commit({ type: "clear" }), [commit]);
  const applyCartReview = useCallback((proposal: CartReviewProposal) => {
    // The journal also compares the source against freshly read cross-tab state.
    const current = cartStorage.current?.read();
    if (current) publish(current);
    if (items === proposal.source && current === proposal.source) commit({ type: "review", source: proposal.source, items: proposal.items });
  }, [commit, items, publish]);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotalCents = items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      addProduct,
      applyCartReview,
      clearCart,
      hydrated,
      itemCount,
      items,
      removeProduct,
      subtotalCents,
      updateQuantity,
    }),
    [addProduct, applyCartReview, clearCart, hydrated, itemCount, items, removeProduct, subtotalCents, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider.");
  return context;
}
