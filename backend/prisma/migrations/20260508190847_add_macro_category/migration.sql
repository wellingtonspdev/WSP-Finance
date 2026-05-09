-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "macroCategoryId" INTEGER;

-- CreateTable
CREATE TABLE "MacroCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MacroCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MacroCategory_code_key" ON "MacroCategory"("code");

-- CreateIndex
CREATE INDEX "Category_macroCategoryId_idx" ON "Category"("macroCategoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_macroCategoryId_fkey" FOREIGN KEY ("macroCategoryId") REFERENCES "MacroCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
