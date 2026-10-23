import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { supplierOfferInclude, toSaleProduct } from "@/features/supplier-catalog/commerce";
import { correctProductSearchQuery, ingredientSearchIdentities, isPrescriptionSearchProduct, normalizeProductSearch, productSearchPlan, productSpellingVocabulary, topicNamePattern } from "./public-search";

export const SEARCH_PAGE_SIZE = 24;

let spellingCache: { expiresAt: number; words: Promise<string[]> } | undefined;
function spellingVocabulary(prisma: ReturnType<typeof getPrisma>) {
  if (!spellingCache || spellingCache.expiresAt <= Date.now()) {
    const entry = {
      expiresAt: Date.now() + 5 * 60_000,
      words: prisma.product.findMany({ where: { status: "ACTIVE" }, select: { name: true, brand: true, activeIngredients: true, searchTerms: true } }).then(productSpellingVocabulary),
    };
    spellingCache = entry;
    void entry.words.catch(() => { if (spellingCache === entry) spellingCache = undefined; });
  }
  return spellingCache.words;
}

const searchSelect = {
  ...supplierOfferInclude,
  cmedReference: true,
  id: true, name: true, slug: true, ean: true, inventorySource: true,
  brand: true, category: true, imageUrl: true, price: true, promotionalPrice: true,
  stock: true, activeIngredients: true, searchTerms: true, searchText: true,
  requiresPrescription: true, prescriptionType: true, isPopularPharmacy: true,
  cashbackEnabled: true, cashbackRateBps: true,
} satisfies Prisma.ProductSelect;

function queryCondition(query: string) {
  const plan = productSearchPlan(query);
  if (plan.blocked) return Prisma.sql`FALSE`;
  const clauses = [
    ...plan.patterns.map(pattern => Prisma.sql`p."searchText" ~ ${pattern}`),
    ...plan.dosePatterns.map(pattern => Prisma.sql`p."name" ~* ${pattern}`),
    ...plan.topics.map(topic => {
      const ingredient = topic.ingredients.length ? Prisma.sql`EXISTS (
        SELECT 1 FROM unnest(p."activeIngredients") ingredient,
          regexp_split_to_table(ingredient, '\\+') component
        WHERE ${normalizedField(Prisma.sql`component`)} IN (${Prisma.join(topic.ingredients)}))` : Prisma.sql`FALSE`;
      const name = topic.namePattern ? Prisma.sql`lower(p."name") ~ ${topic.namePattern}` : Prisma.sql`FALSE`;
      return Prisma.sql`(
        EXISTS (SELECT 1 FROM unnest(p."searchTerms") term
          WHERE ${normalizedField(Prisma.sql`term`)} IN (${Prisma.join(topic.aliases)}))
        OR ${normalizedField(Prisma.sql`p."name"`)} ~ ${topicNamePattern(topic)}
        OR ((CASE WHEN p."catalogClassification" ? 'kind'
          THEN p."catalogClassification"->>'kind' = 'MEDICINE'
          ELSE ${normalizedField(Prisma.sql`p."category"`)} IN ('medicamento', 'medicamentos') END)
          AND (${ingredient} OR ${name})))`;
    }),
  ];
  const condition = clauses.length
    ? Prisma.sql`(${Prisma.join(clauses, " AND ")})`
    : Prisma.sql`FALSE`;
  return plan.topics.length ? Prisma.sql`(${condition} OR ${normalizedField(Prisma.sql`p."sku"`)} = ${normalizeProductSearch(query)})` : condition;
}

function normalizedField(field: Prisma.Sql) {
  return Prisma.sql`trim(regexp_replace(translate(lower(${field}),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', ' ', 'g'))`;
}

function searchOrder(query: string) {
  const normalized = normalizeProductSearch(query);
  return Prisma.sql`CASE
    WHEN lower(p."name") = ${normalized} THEN 500
    WHEN p."searchText" LIKE ${`${normalized}%`} THEN 350
    WHEN lower(p."name") LIKE ${`%${normalized}%`} THEN 250
    ELSE 100 END DESC, p."name" ASC, p."id" ASC`;
}

export async function getSearchCatalog(query: string, { page = 1, pageSize = SEARCH_PAGE_SIZE, relatedLimit = 8 } = {}) {
  const cleanQuery = query.trim();
  let plan = productSearchPlan(cleanQuery);
  if (cleanQuery.length < 2 || cleanQuery.length > 80 || plan.blocked || (!plan.patterns.length && !plan.topics.length)) {
    return { products: [], relatedProducts: [], count: 0, correctedQuery: null as string | null };
  }
  const prisma = getPrisma();
  const safePage = Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
  const safeSize = Math.min(SEARCH_PAGE_SIZE, Math.max(1, pageSize));
  const findMatches = (value: string, size = safeSize, pageNumber = safePage) => prisma.$queryRaw<{ id: string; total: number }[]>(Prisma.sql`
    SELECT p."id", (count(*) OVER())::int AS total FROM "Product" p
    WHERE p."status" = 'ACTIVE' AND ${queryCondition(value)}
    ORDER BY ${searchOrder(value)} LIMIT ${size} OFFSET ${(pageNumber - 1) * size}
  `);
  let matches = await findMatches(cleanQuery);
  let correctedQuery: string | null = null;
  if (!matches.length && /[a-z]{4}/.test(normalizeProductSearch(cleanQuery))) {
    const suggestion = correctProductSearchQuery(cleanQuery, await spellingVocabulary(prisma));
    if (suggestion && (safePage === 1 || !(await findMatches(cleanQuery, 1, 1)).length)) {
      const correctedPlan = productSearchPlan(suggestion);
      if (!correctedPlan.blocked) {
        matches = await findMatches(suggestion);
        if (matches.length) {
          correctedQuery = suggestion;
          plan = correctedPlan;
        }
      }
    }
  }
  const condition = queryCondition(correctedQuery ?? cleanQuery);
  const rows = matches.length ? await prisma.product.findMany({
    where: { status: "ACTIVE", id: { in: matches.map(row => row.id) } }, select: searchSelect,
  }) : [];
  const positions = new Map(matches.map((row, index) => [row.id, index]));
  const products = rows.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!).map(row => toSaleProduct(row));

  // Medical relationships come from registered ingredients, never category alone.
  const identities = ingredientSearchIdentities(products.slice(0, 4).flatMap(product => product.activeIngredients));
  const aliases = identities.slice(0, 8).flatMap(identity => identity === "losartana" ? ["losartana", "losartana potassica"] : [identity]);
  const relatedIds = !plan.topics.length && aliases.length && relatedLimit > 0
    ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p."id" FROM "Product" p WHERE p."status" = 'ACTIVE' AND NOT ${condition}
      AND EXISTS (SELECT 1 FROM unnest(p."activeIngredients") ingredient,
        regexp_split_to_table(ingredient, '\\+') component
        WHERE trim(regexp_replace(translate(lower(component),
          'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+', ' ', 'g'))
          IN (${Prisma.join(aliases)}))
      ORDER BY p."name" ASC, p."id" ASC LIMIT ${Math.min(12, relatedLimit)}
    `) : [];
  const relatedRows = relatedIds.length ? await prisma.product.findMany({
    where: { status: "ACTIVE", id: { in: relatedIds.map(row => row.id) } }, select: searchSelect, orderBy: [{ name: "asc" }, { id: "asc" }],
  }) : [];
  return { products, relatedProducts: relatedRows.map(row => toSaleProduct(row)), count: matches[0]?.total ?? 0, correctedQuery };
}

export type SearchCatalogProduct = Awaited<ReturnType<typeof getSearchCatalog>>["products"][number];

export async function getSearchSidebar(products: SearchCatalogProduct[], { topicSearch = false } = {}) {
  const available = products.filter(product => product.stock > 0 && (!topicSearch || !isPrescriptionSearchProduct(product)));
  if (!available.length) return { title: "Explore o catálogo", products: [] };
  const sales = await getPrisma().orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: available.map(product => product.id) },
      order: {
        status: "COMPLETED", paymentStatus: "PAID",
        OR: [{ onlinePayment: { is: null } }, { onlinePayment: { is: { environment: "production" } } }],
      },
    },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: "desc" } }, { productId: "asc" }],
    take: 5,
  });
  const byId = new Map(available.map(product => [product.id, product]));
  const sold = sales.flatMap(sale => sale.productId && (sale._sum.quantity ?? 0) > 0 && byId.has(sale.productId) ? [byId.get(sale.productId)!] : []);
  return sold.length
    ? { title: "Mais vendidos nesta busca", products: sold }
    : { title: "Relevantes para sua busca", products: available.slice(0, 5) };
}
