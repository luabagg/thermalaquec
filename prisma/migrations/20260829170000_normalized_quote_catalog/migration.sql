-- CreateEnum
CREATE TYPE "CatalogOptionPlacement" AS ENUM ('TITLE', 'DESCRIPTION');

-- CreateEnum
CREATE TYPE "CatalogNormalizationStatus" AS ENUM ('VALIDATED', 'APPLYING', 'APPLIED', 'REVERTING', 'REVERTED', 'FAILED');

-- CreateEnum
CREATE TYPE "CatalogSourceDisposition" AS ENUM ('PARENT_SOURCE', 'VARIANT', 'USE_PARENT_FALLBACK');

-- AlterTable
ALTER TABLE "quote_catalog_items"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "name_template" VARCHAR(300);

-- AlterTable
ALTER TABLE "quotation_lines"
  ADD COLUMN "catalog_selection_snapshot" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "quote_catalog_options" (
    "id" SERIAL NOT NULL,
    "catalog_item_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "placement" "CatalogOptionPlacement" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_catalog_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_catalog_option_values" (
    "id" SERIAL NOT NULL,
    "option_id" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title_fragment" VARCHAR(150),
    "description_lines" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_catalog_option_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_catalog_variants" (
    "id" SERIAL NOT NULL,
    "catalog_item_id" INTEGER NOT NULL,
    "key" VARCHAR(300) NOT NULL,
    "sku" VARCHAR(100),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name_override" VARCHAR(300),
    "description_lines_override" JSONB,
    "unit_price_cents" INTEGER,
    "image_id" INTEGER,

    CONSTRAINT "quote_catalog_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_catalog_variant_values" (
    "variant_id" INTEGER NOT NULL,
    "option_value_id" INTEGER NOT NULL,

    CONSTRAINT "quote_catalog_variant_values_pkey" PRIMARY KEY ("variant_id", "option_value_id")
);

-- CreateTable
CREATE TABLE "quote_catalog_aliases" (
    "id" SERIAL NOT NULL,
    "catalog_item_id" INTEGER NOT NULL,
    "original_name" VARCHAR(300) NOT NULL,
    "normalized_key" VARCHAR(300) NOT NULL,
    "source_slug" VARCHAR(100),
    "source_metadata" JSONB,

    CONSTRAINT "quote_catalog_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_normalization_runs" (
    "id" SERIAL NOT NULL,
    "status" "CatalogNormalizationStatus" NOT NULL DEFAULT 'VALIDATED',
    "schema_version" INTEGER NOT NULL,
    "algorithm_version" VARCHAR(100) NOT NULL,
    "source_snapshot_digest" VARCHAR(64) NOT NULL,
    "source_snapshot" JSONB NOT NULL,
    "proposal" JSONB NOT NULL,
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),
    "reverted_at" TIMESTAMP(3),

    CONSTRAINT "catalog_normalization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_normalization_source_maps" (
    "id" SERIAL NOT NULL,
    "run_id" INTEGER NOT NULL,
    "source_catalog_item_id" INTEGER NOT NULL,
    "canonical_catalog_item_id" INTEGER NOT NULL,
    "source_state_snapshot" JSONB NOT NULL,
    "selected_values_snapshot" JSONB NOT NULL,
    "original_quotation_line_ids" JSONB NOT NULL,
    "price_disposition" "CatalogSourceDisposition" NOT NULL,
    "image_disposition" "CatalogSourceDisposition" NOT NULL,
    "canonical_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_normalization_source_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_catalog_items_archived_at_name_idx" ON "quote_catalog_items"("archived_at", "name");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_options_catalog_item_id_slug_key" ON "quote_catalog_options"("catalog_item_id", "slug");

-- CreateIndex
CREATE INDEX "quote_catalog_options_catalog_item_id_sort_order_idx" ON "quote_catalog_options"("catalog_item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_option_values_option_id_slug_key" ON "quote_catalog_option_values"("option_id", "slug");

-- CreateIndex
CREATE INDEX "quote_catalog_option_values_option_id_sort_order_idx" ON "quote_catalog_option_values"("option_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_variants_sku_key" ON "quote_catalog_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_variants_catalog_item_id_key_key" ON "quote_catalog_variants"("catalog_item_id", "key");

-- CreateIndex
CREATE INDEX "quote_catalog_variants_catalog_item_id_active_idx" ON "quote_catalog_variants"("catalog_item_id", "active");

-- CreateIndex
CREATE INDEX "quote_catalog_variant_values_option_value_id_idx" ON "quote_catalog_variant_values"("option_value_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_catalog_aliases_normalized_key_key" ON "quote_catalog_aliases"("normalized_key");

-- CreateIndex
CREATE INDEX "quote_catalog_aliases_catalog_item_id_idx" ON "quote_catalog_aliases"("catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_normalization_runs_source_snapshot_digest_algorithm_version_key" ON "catalog_normalization_runs"("source_snapshot_digest", "algorithm_version");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_normalization_source_maps_run_id_source_catalog_item_id_key" ON "catalog_normalization_source_maps"("run_id", "source_catalog_item_id");

-- CreateIndex
CREATE INDEX "catalog_normalization_source_maps_canonical_catalog_item_id_idx" ON "catalog_normalization_source_maps"("canonical_catalog_item_id");

-- AddForeignKey
ALTER TABLE "quote_catalog_options" ADD CONSTRAINT "quote_catalog_options_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_option_values" ADD CONSTRAINT "quote_catalog_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "quote_catalog_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_variants" ADD CONSTRAINT "quote_catalog_variants_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_variants" ADD CONSTRAINT "quote_catalog_variants_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_variant_values" ADD CONSTRAINT "quote_catalog_variant_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "quote_catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_variant_values" ADD CONSTRAINT "quote_catalog_variant_values_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "quote_catalog_option_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_catalog_aliases" ADD CONSTRAINT "quote_catalog_aliases_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_normalization_source_maps" ADD CONSTRAINT "catalog_normalization_source_maps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "catalog_normalization_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_normalization_source_maps" ADD CONSTRAINT "catalog_normalization_source_maps_source_catalog_item_id_fkey" FOREIGN KEY ("source_catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_normalization_source_maps" ADD CONSTRAINT "catalog_normalization_source_maps_canonical_catalog_item_id_fkey" FOREIGN KEY ("canonical_catalog_item_id") REFERENCES "quote_catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "quote_catalog_variants"
  ADD CONSTRAINT "quote_catalog_variants_price_nonnegative"
  CHECK ("unit_price_cents" IS NULL OR "unit_price_cents" >= 0);
