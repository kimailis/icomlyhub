-- DropIndex
DROP INDEX "Article_category_publishedAt_idx";

-- DropIndex
DROP INDEX "Article_celebrityId_publishedAt_idx";

-- DropIndex
DROP INDEX "Article_publishedAt_idx";

-- AlterTable
ALTER TABLE "Celebrity" ADD COLUMN     "bioLastUpdated" TIMESTAMP(3),
ADD COLUMN     "category" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "hobbies" TEXT,
ADD COLUMN     "lifeSummary" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "primaryCity" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "relationshipStatus" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sighting" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CelebrityOsint" (
    "id" TEXT NOT NULL,
    "celebrityId" TEXT NOT NULL,
    "reportedPhone" TEXT,
    "currentAddress" TEXT,
    "currentCar" TEXT,
    "frequentedPlaces" TEXT,
    "socialHandles" TEXT,
    "additionalIntel" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataQuality" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "CelebrityOsint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CelebrityOsint_celebrityId_key" ON "CelebrityOsint"("celebrityId");

-- CreateIndex
CREATE INDEX "CelebrityOsint_celebrityId_idx" ON "CelebrityOsint"("celebrityId");

-- CreateIndex
CREATE INDEX "Celebrity_country_idx" ON "Celebrity"("country");

-- CreateIndex
CREATE INDEX "Celebrity_region_idx" ON "Celebrity"("region");

-- CreateIndex
CREATE INDEX "Sighting_country_idx" ON "Sighting"("country");

-- CreateIndex
CREATE INDEX "Sighting_region_idx" ON "Sighting"("region");

-- AddForeignKey
ALTER TABLE "CelebrityOsint" ADD CONSTRAINT "CelebrityOsint_celebrityId_fkey" FOREIGN KEY ("celebrityId") REFERENCES "Celebrity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
