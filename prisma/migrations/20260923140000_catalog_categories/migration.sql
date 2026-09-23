-- Catalog categories. Additive only: families keep working without a category.

-- AlterTable
ALTER TABLE "quote_catalog_items" ADD COLUMN     "category_id" INTEGER;

-- CreateTable
CREATE TABLE "quote_catalog_categories" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_categories_slug_key" ON "quote_catalog_categories"("slug");

-- CreateIndex
CREATE INDEX "quote_catalog_items_category_id_idx" ON "quote_catalog_items"("category_id");

-- AddForeignKey
ALTER TABLE "quote_catalog_items" ADD CONSTRAINT "quote_catalog_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "quote_catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
