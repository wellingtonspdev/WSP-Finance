-- CreateEnum
CREATE TYPE "AiInsightSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AiInsightCode" AS ENUM ('MISTURA_PATRIMONIAL', 'RISCO_MALHA_FINA', 'DESPESA_PESSOAL_POTENCIAL');

-- CreateIndex (unique composta tenant-safe em Transaction para FK composta)
CREATE UNIQUE INDEX "Transaction_workspaceId_id_key" ON "Transaction"("workspaceId", "id");

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "severity" "AiInsightSeverity" NOT NULL,
    "code" "AiInsightCode" NOT NULL,
    "message" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInsight_workspaceId_idx" ON "AiInsight"("workspaceId");

-- CreateIndex
CREATE INDEX "AiInsight_transactionId_idx" ON "AiInsight"("transactionId");

-- CreateIndex
CREATE INDEX "AiInsight_workspaceId_dismissed_idx" ON "AiInsight"("workspaceId", "dismissed");

-- CreateIndex
CREATE INDEX "AiInsight_workspaceId_createdAt_idx" ON "AiInsight"("workspaceId", "createdAt");

-- CreateIndex (unique semantico para idempotencia)
CREATE UNIQUE INDEX "AiInsight_workspaceId_transactionId_code_key" ON "AiInsight"("workspaceId", "transactionId", "code");

-- AddForeignKey (Workspace)
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Transaction - FK composta tenant-safe)
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_workspaceId_transactionId_fkey" FOREIGN KEY ("workspaceId", "transactionId") REFERENCES "Transaction"("workspaceId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraint: confidence deve estar entre 0 e 1
ALTER TABLE "AiInsight" ADD CONSTRAINT "ai_insight_confidence_range"
  CHECK ("confidence" >= 0 AND "confidence" <= 1);

-- Ativar RLS
ALTER TABLE "AiInsight" ENABLE ROW LEVEL SECURITY;

-- Forcar aplicacao
ALTER TABLE "AiInsight" FORCE ROW LEVEL SECURITY;

-- Criar Policy
CREATE POLICY "tenant_isolation_policy" ON "AiInsight"
FOR ALL
USING ("workspaceId" = NULLIF(current_setting('app.current_workspace_id', true), '')::int)
WITH CHECK ("workspaceId" = NULLIF(current_setting('app.current_workspace_id', true), '')::int);
