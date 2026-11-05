CREATE TYPE "CatalogIdentityPublicState" AS ENUM ('PRIVATE', 'PUBLIC', 'SUPPRESSED');
CREATE TYPE "CatalogIdentityRegulatoryStatus" AS ENUM ('UNKNOWN', 'NON_MEDICINE');

-- Same widths and checksum as the domain normalizeGtin. Packaging indicators survive.
CREATE FUNCTION catalog_identity_gtin(raw text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE value text := btrim(raw); total integer := 0; weight integer := 3; i integer;
BEGIN
  IF value !~ '^([0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$' THEN RETURN NULL; END IF;
  FOR i IN REVERSE length(value)-1..1 LOOP
    total := total + substr(value, i, 1)::integer * weight;
    weight := 4 - weight;
  END LOOP;
  IF (10 - total % 10) % 10 <> right(value, 1)::integer THEN RETURN NULL; END IF;
  RETURN lpad(value, 14, '0');
END;
$$;

CREATE TABLE "CatalogIdentity" (
  "gtinCanonical" text PRIMARY KEY,
  "ean" text NOT NULL,
  "name" text NOT NULL,
  "categoryName" text,
  "categorySlug" text,
  "identitySha256" text NOT NULL,
  "sourceFileSha256" text NOT NULL,
  "sourceRecord" jsonb NOT NULL,
  "publicState" "CatalogIdentityPublicState" NOT NULL DEFAULT 'PRIVATE',
  "regulatoryStatus" "CatalogIdentityRegulatoryStatus" NOT NULL DEFAULT 'UNKNOWN',
  "reviewIdentitySha256" text,
  "reviewedAt" timestamp(3),
  "reviewedBy" text,
  "reviewEvidence" text,
  "suppressedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  CONSTRAINT "CatalogIdentity_valid_gtin" CHECK (catalog_identity_gtin("gtinCanonical") IS NOT NULL AND catalog_identity_gtin("ean") IS NOT NULL AND catalog_identity_gtin("gtinCanonical") = "gtinCanonical" AND catalog_identity_gtin("ean") = "gtinCanonical" AND length("gtinCanonical") = 14),
  CONSTRAINT "CatalogIdentity_valid_hash" CHECK ("identitySha256" ~ '^[a-f0-9]{64}$' AND "sourceFileSha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "CatalogIdentity_public_review" CHECK ("publicState" <> 'PUBLIC' OR (
    "regulatoryStatus" = 'NON_MEDICINE' AND "reviewIdentitySha256" IS NOT NULL AND
    "reviewIdentitySha256" = "identitySha256" AND "reviewedAt" IS NOT NULL AND
    "reviewedBy" IS NOT NULL AND length(btrim("reviewedBy")) > 0 AND
    "reviewEvidence" IS NOT NULL AND length(btrim("reviewEvidence")) >= 20 AND "suppressedAt" IS NULL
  )),
  CONSTRAINT "CatalogIdentity_suppression_state" CHECK ("suppressedAt" IS NULL OR "publicState" = 'SUPPRESSED')
);
CREATE INDEX "CatalogIdentity_publicState_regulatoryStatus_gtinCanonical_idx" ON "CatalogIdentity" ("publicState", "regulatoryStatus", "gtinCanonical");
CREATE TABLE "CatalogIdentitySuppression" (
  "gtinCanonical" text PRIMARY KEY,
  "reason" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatalogIdentitySuppression_valid_gtin" CHECK (length("gtinCanonical") = 14 AND catalog_identity_gtin("gtinCanonical") IS NOT NULL AND catalog_identity_gtin("gtinCanonical") = "gtinCanonical")
);

-- Existing Products in ALL states, including trash, reserve both explicit GTIN fields.
INSERT INTO "CatalogIdentitySuppression" ("gtinCanonical", "reason")
SELECT DISTINCT canonical, 'PRODUCT_EXISTED_AT_MIGRATION'
FROM "Product" p CROSS JOIN LATERAL (VALUES (catalog_identity_gtin(p."ean")), (catalog_identity_gtin(p."eanNormalized"))) v(canonical)
WHERE canonical IS NOT NULL ON CONFLICT DO NOTHING;

-- Historical records only when audit metadata explicitly includes a GTIN.
-- Names and product IDs alone cannot recover an EAN of a previously purged Product.
INSERT INTO "CatalogIdentitySuppression" ("gtinCanonical", "reason")
SELECT DISTINCT canonical, 'PRODUCT_AUDIT_GTIN'
FROM "AuditLog" a CROSS JOIN LATERAL (VALUES
  (catalog_identity_gtin(a.metadata->>'ean')),
  (catalog_identity_gtin(a.metadata->>'eanNormalized')),
  (catalog_identity_gtin(a.metadata->'before'->>'ean')),
  (catalog_identity_gtin(a.metadata->'before'->>'eanNormalized')),
  (catalog_identity_gtin(a.metadata->'after'->>'ean')),
  (catalog_identity_gtin(a.metadata->'after'->>'eanNormalized'))
) v(canonical)
WHERE a.entity = 'Product' AND canonical IS NOT NULL ON CONFLICT DO NOTHING;

CREATE FUNCTION catalog_identity_product_tombstone() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE raw_gtin text; canonical text; old_ean text; old_normalized text; new_ean text; new_normalized text;
BEGIN
  PERFORM pg_advisory_xact_lock(87164322);
  IF TG_OP <> 'INSERT' THEN old_ean := OLD."ean"; old_normalized := OLD."eanNormalized"; END IF;
  IF TG_OP <> 'DELETE' THEN new_ean := NEW."ean"; new_normalized := NEW."eanNormalized"; END IF;
  FOREACH raw_gtin IN ARRAY ARRAY[old_ean, old_normalized, new_ean, new_normalized] LOOP
    canonical := catalog_identity_gtin(raw_gtin);
    IF canonical IS NOT NULL THEN
      INSERT INTO "CatalogIdentitySuppression" ("gtinCanonical", "reason") VALUES (canonical, 'PRODUCT_RESERVED_GTIN') ON CONFLICT DO NOTHING;
      UPDATE "CatalogIdentity" SET "publicState" = 'SUPPRESSED', "suppressedAt" = COALESCE("suppressedAt", CURRENT_TIMESTAMP), "updatedAt" = CURRENT_TIMESTAMP
      WHERE "gtinCanonical" = canonical AND ("publicState" <> 'SUPPRESSED' OR "suppressedAt" IS NULL);
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Product_catalog_identity_tombstone" AFTER INSERT OR UPDATE OF "ean", "eanNormalized" OR DELETE ON "Product"
FOR EACH ROW EXECUTE FUNCTION catalog_identity_product_tombstone();

-- Fail closed even if another writer attempts a direct identity insert/update.
CREATE FUNCTION catalog_identity_enforce_suppression() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(87164322);
  IF TG_OP = 'UPDATE' THEN
    IF NEW."gtinCanonical" <> OLD."gtinCanonical" THEN
      RAISE EXCEPTION 'Catalog identity canonical GTIN is immutable';
    END IF;
    IF ROW(NEW."ean", NEW."name", NEW."categoryName", NEW."categorySlug", NEW."sourceRecord") IS DISTINCT FROM
       ROW(OLD."ean", OLD."name", OLD."categoryName", OLD."categorySlug", OLD."sourceRecord") AND
       NEW."reviewIdentitySha256" IS NOT DISTINCT FROM OLD."reviewIdentitySha256" THEN
      NEW."publicState" := 'PRIVATE';
      NEW."regulatoryStatus" := 'UNKNOWN';
      NEW."reviewIdentitySha256" := NULL;
      NEW."reviewedAt" := NULL;
      NEW."reviewedBy" := NULL;
      NEW."reviewEvidence" := NULL;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM "CatalogIdentitySuppression" WHERE "gtinCanonical" = NEW."gtinCanonical") OR
    (TG_OP = 'UPDATE' AND OLD."publicState" = 'SUPPRESSED') THEN
    NEW."publicState" := 'SUPPRESSED';
    NEW."suppressedAt" := COALESCE(NEW."suppressedAt", CURRENT_TIMESTAMP);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "CatalogIdentity_enforce_suppression" BEFORE INSERT OR UPDATE ON "CatalogIdentity"
FOR EACH ROW EXECUTE FUNCTION catalog_identity_enforce_suppression();
