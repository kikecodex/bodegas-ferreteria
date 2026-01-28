-- AlterTable
ALTER TABLE "Product" ADD COLUMN "avgDailySales" REAL;
ALTER TABLE "Product" ADD COLUMN "lastOrderDate" DATETIME;
ALTER TABLE "Product" ADD COLUMN "preferredVendor" TEXT;
ALTER TABLE "Product" ADD COLUMN "reorderPoint" INTEGER;

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "conversionFactor" REAL NOT NULL,
    "price" REAL NOT NULL,
    "barcode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitOfMeasure_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReorderAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL,
    "reorderPoint" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" DATETIME,
    "orderedAt" DATETIME,
    "resolvedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReorderAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_productId_abbreviation_key" ON "UnitOfMeasure"("productId", "abbreviation");
