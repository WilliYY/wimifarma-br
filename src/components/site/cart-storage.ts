import type { CartItem, CartProduct } from "./cart-provider";
import { orderQuantityLimit } from "@/features/products/quantity";
import { requiresPurchaseAssistance } from "@/features/products/purchase-policy";
import { publicProductImageUrl } from "@/features/product-images/private-supplier-policy";

export const CART_LEGACY_KEY = "wimifarma-cart-v1";
export const CART_OPERATION_PREFIX = "wimifarma-cart-op-v2:";
export const CART_BASE_PREFIX = "wimifarma-cart-base-v2:";
export type CartOperation =
  | { type: "add"; product: CartProduct; quantity: number; onlyIfMissing?: boolean }
  | { type: "quantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" }
  | { type: "review"; source: CartItem[]; items: CartItem[] };
type Entry = { clock: number; id: string; operation: CartOperation; basis?: string };
const recordIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 64 &&
    typeof item.slug === "string" && typeof item.name === "string" &&
    (typeof item.imageUrl === "string" || item.imageUrl === null) &&
    (typeof item.category === "string" || item.category === null) &&
    Number.isSafeInteger(item.unitPriceCents) && Number(item.unitPriceCents) > 0 &&
    (Number.isSafeInteger(item.originalPriceCents) || item.originalPriceCents === null) &&
    Number.isSafeInteger(item.stock) && Number(item.stock) > 0 &&
    typeof item.requiresPrescription === "boolean" &&
    (item.prescriptionType === undefined || (typeof item.prescriptionType === "string" && ["UNREVIEWED", "ORDINARY", "CONTROLLED", "ANTIMICROBIAL"].includes(item.prescriptionType))) &&
    typeof item.isPopularPharmacy === "boolean" && Number.isSafeInteger(item.quantity) &&
    Number(item.quantity) > 0 && Number(item.quantity) <= orderQuantityLimit({ stock: Number(item.stock), inventorySource: typeof item.inventorySource === "string" ? item.inventorySource : undefined, supplierDemandAllowed: item.supplierDemandAllowed === true });
}

function normalize(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter(isCartItem).filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id); return true;
  }).slice(0, 30).map(item => ({ ...item, imageUrl: publicProductImageUrl(item) }));
}

function validOperation(value: unknown): value is CartOperation {
  if (!value || typeof value !== "object") return false;
  const op = value as CartOperation;
  switch (op.type) {
    case "clear": return true;
    case "remove": return typeof op.productId === "string" && op.productId.length > 0 && op.productId.length <= 64;
    case "quantity": return typeof op.productId === "string" && op.productId.length > 0 && op.productId.length <= 64 && Number.isFinite(op.quantity);
    case "add": return Number.isFinite(op.quantity) && (op.onlyIfMissing === undefined || typeof op.onlyIfMissing === "boolean") && isCartItem({ ...op.product, quantity: 1 });
    case "review": return Array.isArray(op.source) && Array.isArray(op.items) && op.source.length <= 30 && op.items.length <= 30 && op.source.every(isCartItem) && op.items.every(isCartItem);
    default: return false;
  }
}

export function applyCartOperation(items: CartItem[], op: CartOperation): CartItem[] {
  switch (op.type) {
    case "clear": return [];
    case "remove": return items.filter(item => item.id !== op.productId);
    case "quantity": return items.map(item => item.id === op.productId
      ? { ...item, quantity: Math.min(Math.max(Math.trunc(op.quantity), 0), orderQuantityLimit(item)) } : item).filter(item => item.quantity > 0);
    case "review": return JSON.stringify(items) === JSON.stringify(op.source) ? normalize(op.items) : items;
    case "add": {
      if (requiresPurchaseAssistance(op.product)) return items;
      const product = { ...op.product, imageUrl: publicProductImageUrl(op.product) };
      const quantity = Math.min(Math.max(Math.trunc(op.quantity), 1), orderQuantityLimit(product));
      const existing = items.find(item => item.id === product.id);
      if (!existing) return items.length >= 30 ? items : [...items, { ...product, quantity }];
      if (op.onlyIfMissing) return items;
      return items.map(item => item.id === product.id ? { ...item, ...product, quantity: Math.min(item.quantity + quantity, orderQuantityLimit(product)) } : item);
    }
  }
}

function compareEntries(a: Entry, b: Entry): number {
  return a.clock - b.clock || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function parseEntry(raw: string | null, key: string): Entry | null {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Entry;
    if (!Number.isSafeInteger(entry.clock) || entry.clock < 1 || !recordIdPattern.test(entry.id) || entry.id !== key.slice(CART_OPERATION_PREFIX.length) || !validOperation(entry.operation) || (entry.operation.type === "review" && typeof entry.basis !== "string")) return null;
    return entry;
  } catch { return null; }
}

/** One immutable key per operation: simultaneous writers cannot overwrite each other.
 * A durable clear barrier permits pruning only earlier records; ordinary edits never compact.
 */
export class CartStorage {
  private entries = new Map<string, Entry>();
  private baseline: CartItem[] = [];
  private bases = new Map<string, CartItem[]>();
  private baseId = "memory";
  private clock = 0;
  private initialized = false;
  private revision: string | null = null;
  private snapshot: CartItem[] = [];
  private acceptedReviews = new Set<string>();

  constructor(private storage: Storage, private onStorageError: () => void = () => {}) {}

  private orderedEntries(): Entry[] {
    return [...this.entries.values()].sort(compareEntries);
  }

  private revisionFor(ordered: Entry[]): string {
    const clearIndex = ordered.findLastIndex(entry => entry.operation.type === "clear");
    return JSON.stringify([clearIndex < 0 ? `base:${this.baseId}` : `clear:${ordered[clearIndex].id}`, ordered.slice(clearIndex + 1).map(entry => entry.id)]);
  }

  read(): CartItem[] {
    try {
      // Capture legacy before checking bootstrap. A clear barrier always takes precedence.
      const saved = !this.initialized ? this.storage.getItem(CART_LEGACY_KEY) : null;
      const keys = Array.from({ length: this.storage.length }, (_, index) => this.storage.key(index)).filter((key): key is string => key !== null);
      const persisted = new Set<string>();
      for (const key of keys) {
        if (!key.startsWith(CART_OPERATION_PREFIX)) continue;
        const entry = parseEntry(this.storage.getItem(key), key);
        if (!entry) continue;
        this.entries.set(entry.id, entry);
        persisted.add(entry.id);
        this.clock = Math.max(this.clock, entry.clock);
      }
      const ordered = this.orderedEntries();
      const barrier = ordered.findLast(entry => entry.operation.type === "clear" && persisted.has(entry.id));
      const hasClear = ordered.some(entry => entry.operation.type === "clear");
      if (hasClear) {
        this.baseline = [];
        this.bases.clear();
        this.baseId = "cleared";
        this.initialized = true;
      } else {
        for (const key of keys) {
          if (!key.startsWith(CART_BASE_PREFIX)) continue;
          const id = key.slice(CART_BASE_PREFIX.length);
          if (!recordIdPattern.test(id)) continue;
          try {
            const raw = this.storage.getItem(key);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length <= 30 && parsed.every(isCartItem)) this.bases.set(id, normalize(parsed));
          } catch { /* Ignore invalid bootstrap records. */ }
        }
        if (!this.bases.size && !this.initialized) {
          let seed: CartItem[];
          try { seed = normalize(saved ? JSON.parse(saved) : []); } catch { seed = []; }
          const id = crypto.randomUUID();
          this.bases.set(id, seed);
          this.baseId = id;
          this.baseline = seed;
          this.initialized = true;
          this.storage.setItem(CART_BASE_PREFIX + id, JSON.stringify(seed));
        }
        if (this.bases.size) {
          this.baseId = [...this.bases.keys()].sort()[0];
          this.baseline = this.bases.get(this.baseId)!;
          this.initialized = true;
        }
      }
      // Only a barrier observed in durable storage authorizes deletion. Never
      // prune on the strength of a failed or still-pending clear write.
      if (barrier) {
        for (const key of keys) {
          if (key === CART_LEGACY_KEY || key.startsWith(CART_BASE_PREFIX)) {
            this.storage.removeItem(key);
          } else if (key.startsWith(CART_OPERATION_PREFIX)) {
            const current = parseEntry(this.storage.getItem(key), key);
            if (!current || compareEntries(current, barrier) < 0) this.storage.removeItem(key);
          }
        }
        for (const entry of ordered) if (compareEntries(entry, barrier) < 0) this.entries.delete(entry.id);
      }
    } catch { this.onStorageError(); /* Retain this tab's in-memory operations. */ }
    const ordered = this.orderedEntries();
    const revision = this.revisionFor(ordered);
    if (revision !== this.revision) {
      this.revision = revision;
      this.acceptedReviews.clear();
      this.snapshot = ordered.reduce((items, entry, index) => {
        if (entry.operation.type === "review") {
          if (entry.basis !== this.revisionFor(ordered.slice(0, index)) || JSON.stringify(items) !== JSON.stringify(entry.operation.source)) return items;
          this.acceptedReviews.add(entry.id);
        }
        return applyCartOperation(items, entry.operation);
      }, this.baseline);
      // Even edits which restore the same values invalidate an earlier review source.
      this.snapshot = [...this.snapshot];
    }
    return this.snapshot;
  }

  commit(operation: CartOperation): CartItem[] {
    this.read();
    if (!validOperation(operation)) return this.read();
    if (operation.type === "add" && operation.onlyIfMissing && this.snapshot.some(item => item.id === operation.product.id)) return this.snapshot;
    if (operation.type === "review" && operation.source !== this.snapshot) return this.snapshot;
    const entry: Entry = { clock: ++this.clock, id: crypto.randomUUID(), operation, ...(operation.type === "review" ? { basis: this.revision! } : {}) };
    this.entries.set(entry.id, entry);
    try { this.storage.setItem(CART_OPERATION_PREFIX + entry.id, JSON.stringify(entry)); }
    catch { this.onStorageError(); /* Keep usable in memory when storage is blocked/full. */ }
    const next = this.read();
    // CartPage acknowledges an applied proposal by its items' identity. Preserve
    // that public contract only when the shared replay accepted the exact result.
    if (operation.type === "review" && this.acceptedReviews.has(entry.id) && JSON.stringify(next) === JSON.stringify(operation.items)) {
      this.snapshot = operation.items;
    }
    return this.snapshot;
  }
}
