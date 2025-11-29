-- Fix CASCADE delete for Batches
ALTER TABLE "Batches" DROP CONSTRAINT IF EXISTS "Batches_productId_fkey";
ALTER TABLE "Batches" ADD CONSTRAINT "Batches_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Products"(id) ON DELETE CASCADE;
