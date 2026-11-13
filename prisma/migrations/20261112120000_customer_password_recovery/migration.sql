BEGIN;

ALTER TABLE "Customer"
ADD COLUMN "passwordRecoveryVerifiedEmail" TEXT,
ADD COLUMN "passwordRecoveryVerifiedAt" TIMESTAMP(3);

CREATE TABLE "CustomerPasswordRecovery" (
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "credentialVersion" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerPasswordRecovery_pkey" PRIMARY KEY ("customerId")
);

CREATE UNIQUE INDEX "CustomerPasswordRecovery_tokenHash_key" ON "CustomerPasswordRecovery"("tokenHash");

ALTER TABLE "CustomerPasswordRecovery"
ADD CONSTRAINT "CustomerPasswordRecovery_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomerRecoveryEmailVerification" (
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "credentialVersion" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerRecoveryEmailVerification_pkey" PRIMARY KEY ("customerId")
);

ALTER TABLE "CustomerRecoveryEmailVerification"
ADD CONSTRAINT "CustomerRecoveryEmailVerification_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A previous address must not become verified again if the account changes back to it.
CREATE FUNCTION "invalidateCustomerPasswordRecoveryEmail"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD."email" IS DISTINCT FROM NEW."email" THEN
        NEW."passwordRecoveryVerifiedEmail" := NULL;
        NEW."passwordRecoveryVerifiedAt" := NULL;

        UPDATE "CustomerPasswordRecovery"
        SET "consumedAt" = CURRENT_TIMESTAMP
        WHERE "customerId" = OLD."id" AND "consumedAt" IS NULL;

        UPDATE "CustomerRecoveryEmailVerification"
        SET "consumedAt" = CURRENT_TIMESTAMP
        WHERE "customerId" = OLD."id" AND "consumedAt" IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "Customer_invalidatePasswordRecoveryEmail"
BEFORE UPDATE OF "email" ON "Customer"
FOR EACH ROW EXECUTE FUNCTION "invalidateCustomerPasswordRecoveryEmail"();

COMMIT;
