-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'final');

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "parentId" INTEGER,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100),
    "shortDescription" VARCHAR(250),
    "description" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "brandId" INTEGER,
    "categoryId" INTEGER,
    "imageId" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "location" VARCHAR(250) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseProduct" (
    "id" SERIAL NOT NULL,
    "showcaseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ShowcaseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showcase" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "imageId" INTEGER,

    CONSTRAINT "Showcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_clients" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(150) NOT NULL,
    "location" VARCHAR(150),
    "document" VARCHAR(20),

    CONSTRAINT "quote_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_catalog_items" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "default_unit_price_cents" INTEGER,
    "image_id" INTEGER,

    CONSTRAINT "quote_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "issued_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "client_id" INTEGER NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_lines" (
    "id" SERIAL NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "name" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "unit_price_cents" INTEGER NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "catalog_item_id" INTEGER,
    "image_id" INTEGER,

    CONSTRAINT "quotation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_payment_options" (
    "id" SERIAL NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "label" VARCHAR(200) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "detail" VARCHAR(300),
    "quotation_id" INTEGER NOT NULL,

    CONSTRAINT "quotation_payment_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Product_name_visible_idx" ON "Product"("name", "visible");

-- CreateIndex
CREATE INDEX "Product_viewCount_idx" ON "Product"("viewCount");

-- CreateIndex
CREATE UNIQUE INDEX "Image_location_key" ON "Image"("location");

-- CreateIndex
CREATE UNIQUE INDEX "Showcase_name_key" ON "Showcase"("name");

-- CreateIndex
CREATE INDEX "Showcase_name_visible_idx" ON "Showcase"("name", "visible");

-- CreateIndex
CREATE INDEX "Showcase_viewCount_idx" ON "Showcase"("viewCount");

-- CreateIndex
CREATE INDEX "quote_clients_name_idx" ON "quote_clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_items_slug_key" ON "quote_catalog_items"("slug");

-- CreateIndex
CREATE INDEX "quote_catalog_items_name_idx" ON "quote_catalog_items"("name");

-- CreateIndex
CREATE INDEX "quotations_client_id_idx" ON "quotations"("client_id");

-- CreateIndex
CREATE INDEX "quotations_issued_at_idx" ON "quotations"("issued_at");

-- CreateIndex
CREATE INDEX "quotation_lines_quotation_id_idx" ON "quotation_lines"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_payment_options_quotation_id_idx" ON "quotation_payment_options"("quotation_id");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseProduct" ADD CONSTRAINT "ShowcaseProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseProduct" ADD CONSTRAINT "ShowcaseProduct_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "Showcase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_items" ADD CONSTRAINT "quote_catalog_items_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "quote_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_payment_options" ADD CONSTRAINT "quotation_payment_options_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
