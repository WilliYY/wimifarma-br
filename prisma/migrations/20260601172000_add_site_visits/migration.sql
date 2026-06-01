CREATE TABLE "SiteVisit" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "firstPath" TEXT,
  "lastPath" TEXT,
  "referrer" TEXT,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "views" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteVisit_sessionId_key" ON "SiteVisit"("sessionId");
CREATE INDEX "SiteVisit_firstSeenAt_idx" ON "SiteVisit"("firstSeenAt");
CREATE INDEX "SiteVisit_lastSeenAt_idx" ON "SiteVisit"("lastSeenAt");
