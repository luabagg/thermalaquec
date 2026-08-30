-- Fresh undeployed application: remove the unused database-backed marketing product domain.
-- Public marketing products remain sourced from app/data/products.ts.
DROP TABLE "ShowcaseProduct";
DROP TABLE "ProductSpec";
DROP TABLE "Showcase";
DROP TABLE "Product";
DROP TABLE "Brand";
DROP TABLE "Category";
