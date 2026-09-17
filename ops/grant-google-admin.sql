\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(87164321);
SELECT set_config('wimifarma.bootstrap_email', :'email', true);
SELECT set_config('wimifarma.bootstrap_customer', :'customer_id', true);
DO $$
DECLARE
  c "Customer"%ROWTYPE;
  u "User"%ROWTYPE;
BEGIN
  SELECT * INTO STRICT c FROM "Customer"
    WHERE id = current_setting('wimifarma.bootstrap_customer')
    AND lower(email) = lower(current_setting('wimifarma.bootstrap_email'))
    AND status = 'ACTIVE' AND "googleSubject" IS NOT NULL FOR UPDATE;
  SELECT * INTO u FROM "User" WHERE lower(email) = lower(c.email) OR "customerId" = c.id;
  IF FOUND THEN
    IF u."customerId" = c.id AND u.role = 'ADMIN' AND u."isActive" THEN
      RAISE NOTICE 'Authorized Google administrator already linked';
      RETURN;
    END IF;
    RAISE EXCEPTION 'Unexpected existing access; manual review required';
  END IF;
  INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "customerId", "lastLoginAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, c.name, c.email, '!GOOGLE_ONLY', 'ADMIN', true, c.id, c."lastLoginAt", now(), now()) RETURNING * INTO u;
  INSERT INTO "AuditLog" (id, "userId", action, entity, "entityId", metadata, "createdAt")
    VALUES (gen_random_uuid()::text, u.id, 'OWNER_GOOGLE_ADMIN_GRANTED', 'UserAccess', u.id,
      jsonb_build_object('customerId', c.id, 'source', 'explicit_owner_request', 'role', 'ADMIN', 'requiresFreshGoogleLogin', true), now());
END $$;
COMMIT;
