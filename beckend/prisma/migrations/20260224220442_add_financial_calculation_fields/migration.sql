-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "feeAmount" DECIMAL(19,4),
ADD COLUMN     "netValue" DECIMAL(19,4),
ADD COLUMN     "platformFeeRate" DECIMAL(5,2);
