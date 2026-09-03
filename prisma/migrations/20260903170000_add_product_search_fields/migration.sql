ALTER TABLE "Product"
ADD COLUMN "activeIngredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "searchTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "Product"
SET "searchText" = trim(
  regexp_replace(
    translate(
      lower(
        concat_ws(
          ' ',
          "name",
          "brand",
          "category",
          "description",
          "ean",
          "sku"
        )
      ),
      'áàãâäéèêëíìîïóòõôöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ),
    '[^a-z0-9]+',
    ' ',
    'g'
  )
);
