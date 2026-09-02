import assert from "node:assert/strict";
import test from "node:test";
import {
  filterAndSortProducts,
  getProductCategories,
  type ProductCatalogItem,
} from "./catalog";
import { productUpdateSchema } from "./schema";

const products: ProductCatalogItem[] = [
  {
    brand: "Cimed",
    category: "Medicamentos",
    createdAt: "2026-09-02T12:00:00.000Z",
    ean: "789000000001",
    name: "Cimegrip 20cp",
    price: "16.90",
    promotionalPrice: "9.99",
    sku: "CIM-20",
    status: "ACTIVE",
    stock: 30,
  },
  {
    brand: null,
    category: "Bem-estar",
    createdAt: "2026-09-01T12:00:00.000Z",
    ean: null,
    name: "Produto demonstrativo",
    price: "29.90",
    promotionalPrice: null,
    sku: null,
    status: "DRAFT",
    stock: 5,
  },
];

test("filtra produtos por busca, status e categoria", () => {
  const result = filterAndSortProducts(products, {
    category: "medicamentos",
    query: "cimed",
    sort: "newest",
    status: "ACTIVE",
  });

  assert.deepEqual(result.map((product) => product.name), ["Cimegrip 20cp"]);
});

test("ordena por menor estoque e lista categorias sem duplicar", () => {
  const result = filterAndSortProducts(products, {
    category: "",
    query: "",
    sort: "stock",
    status: "ALL",
  });

  assert.equal(result[0]?.name, "Produto demonstrativo");
  assert.deepEqual(getProductCategories(products), ["Bem-estar", "Medicamentos"]);
});

test("valida a data esperada e os precos ao editar", () => {
  const parsed = productUpdateSchema.safeParse({
    expectedUpdatedAt: "2026-09-02T12:00:00.000Z",
    isPopularPharmacy: false,
    name: "Cimegrip 20cp",
    price: "16.90",
    promotionalPrice: "9.99",
    requiresPrescription: false,
    status: "ACTIVE",
    stock: "30",
  });

  assert.equal(parsed.success, true);
});

test("aceita remover campos opcionais durante a edicao", () => {
  const parsed = productUpdateSchema.safeParse({
    brand: null,
    category: null,
    description: null,
    ean: null,
    expectedUpdatedAt: "2026-09-02T12:00:00.000Z",
    isPopularPharmacy: false,
    name: "Cimegrip 20cp",
    price: "16.90",
    promotionalPrice: null,
    requiresPrescription: false,
    sku: null,
    status: "ACTIVE",
    stock: "30",
  });

  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.promotionalPrice, null);
});
