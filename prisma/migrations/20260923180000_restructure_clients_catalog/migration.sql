-- Replaces the client model and the option-based catalog with products and flat variants.
-- Drops and recreates tables, so it refuses to run when any of them holds rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "quote_clients")
    OR EXISTS (SELECT 1 FROM "quote_catalog_items")
    OR EXISTS (SELECT 1 FROM "quote_catalog_categories")
    OR EXISTS (SELECT 1 FROM "quotations")
    OR EXISTS (SELECT 1 FROM "Image") THEN
    RAISE EXCEPTION 'restructure_clients_catalog needs empty client, catalog, quotation and image tables';
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "quote_catalog_items" DROP CONSTRAINT "quote_catalog_items_image_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_items" DROP CONSTRAINT "quote_catalog_items_category_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_options" DROP CONSTRAINT "quote_catalog_options_catalog_item_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_option_values" DROP CONSTRAINT "quote_catalog_option_values_option_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_variants" DROP CONSTRAINT "quote_catalog_variants_catalog_item_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_variants" DROP CONSTRAINT "quote_catalog_variants_image_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_variant_values" DROP CONSTRAINT "quote_catalog_variant_values_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "quote_catalog_variant_values" DROP CONSTRAINT "quote_catalog_variant_values_option_value_id_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_client_id_fkey";

-- DropForeignKey
ALTER TABLE "quotation_lines" DROP CONSTRAINT "quotation_lines_catalog_item_id_fkey";

-- DropForeignKey
ALTER TABLE "quotation_lines" DROP CONSTRAINT "quotation_lines_image_id_fkey";

-- DropIndex
DROP INDEX "quotations_issued_at_idx";

-- DropIndex
DROP INDEX "quotations_owner_user_id_idx";

-- DropIndex
DROP INDEX "quotation_lines_quotation_id_idx";

-- DropIndex
DROP INDEX "quotation_payment_options_quotation_id_idx";

-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "title";

-- AlterTable
ALTER TABLE "quotation_lines" DROP COLUMN "catalog_item_id",
DROP COLUMN "catalog_selection_snapshot",
ADD COLUMN     "catalog_variant_id" INTEGER,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(300);

-- DropTable
DROP TABLE "Image";

-- DropTable
DROP TABLE "quote_clients";

-- DropTable
DROP TABLE "quote_catalog_items";

-- DropTable
DROP TABLE "quote_catalog_categories";

-- DropTable
DROP TABLE "quote_catalog_options";

-- DropTable
DROP TABLE "quote_catalog_option_values";

-- DropTable
DROP TABLE "quote_catalog_variants";

-- DropTable
DROP TABLE "quote_catalog_variant_values";

-- DropEnum
DROP TYPE "CatalogOptionPlacement";

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "location" VARCHAR(250) NOT NULL,
    "thumbnail" VARCHAR(250),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "document" VARCHAR(14),
    "phone" VARCHAR(13),
    "email" VARCHAR(150),
    "postal_code" VARCHAR(8),
    "street" VARCHAR(150),
    "number" VARCHAR(20),
    "complement" VARCHAR(100),
    "district" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "name" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(80),
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "category_id" INTEGER,
    "image_id" INTEGER,

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '[]',
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "price_cents" INTEGER,
    "image_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catalog_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "images_location_key" ON "images"("location");

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_key" ON "clients"("document");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");

-- CreateIndex
CREATE INDEX "catalog_products_archived_at_name_idx" ON "catalog_products"("archived_at", "name");

-- CreateIndex
CREATE INDEX "catalog_products_category_id_idx" ON "catalog_products"("category_id");

-- CreateIndex
CREATE INDEX "catalog_variants_product_id_sort_order_idx" ON "catalog_variants"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "quotations_owner_user_id_issued_at_idx" ON "quotations"("owner_user_id", "issued_at");

-- CreateIndex
CREATE INDEX "quotation_lines_quotation_id_sort_order_idx" ON "quotation_lines"("quotation_id", "sort_order");

-- CreateIndex
CREATE INDEX "quotation_lines_catalog_variant_id_idx" ON "quotation_lines"("catalog_variant_id");

-- CreateIndex
CREATE INDEX "quotation_payment_options_quotation_id_sort_order_idx" ON "quotation_payment_options"("quotation_id", "sort_order");

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_catalog_variant_id_fkey" FOREIGN KEY ("catalog_variant_id") REFERENCES "catalog_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

