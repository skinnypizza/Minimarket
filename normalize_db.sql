-- Normalization Script
-- This script removes redundant columns to adhere to 3NF

-- 1. Remove changeGiven from Sales
ALTER TABLE "Sales" DROP COLUMN IF EXISTS "changeGiven";

-- 2. Remove totalPrice from SaleProducts
ALTER TABLE "SaleProducts" DROP COLUMN IF EXISTS "totalPrice";

-- Note: The application logic has been updated to calculate these values on the fly.
