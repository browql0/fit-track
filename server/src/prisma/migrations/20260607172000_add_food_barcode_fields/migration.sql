ALTER TABLE "foods" ADD COLUMN "barcode" VARCHAR(64);
ALTER TABLE "foods" ADD COLUMN "brand" VARCHAR(255);
ALTER TABLE "foods" ADD COLUMN "image_url" TEXT;
ALTER TABLE "foods" ADD COLUMN "source" VARCHAR(50);

CREATE UNIQUE INDEX "foods_barcode_key" ON "foods"("barcode");
