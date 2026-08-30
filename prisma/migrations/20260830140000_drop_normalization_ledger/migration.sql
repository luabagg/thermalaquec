-- The catalog is normalized directly by scripts/catalog. The run ledger, the source
-- maps and the alias table are no longer part of the product.

-- DropTable
DROP TABLE "catalog_normalization_source_maps";

-- DropTable
DROP TABLE "catalog_normalization_runs";

-- DropTable
DROP TABLE "quote_catalog_aliases";

-- DropEnum
DROP TYPE "CatalogNormalizationStatus";

-- DropEnum
DROP TYPE "CatalogSourceDisposition";
