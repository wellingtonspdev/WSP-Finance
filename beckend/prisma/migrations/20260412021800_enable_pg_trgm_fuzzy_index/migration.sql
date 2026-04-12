-- CreateExtension pg_trgm (Deduplicação Fuzzy - Sprint 2)
-- Risco: Supabase Free *pode* negar. Fallback LIKE/LOWER no application layer.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca fuzzy por trigramas na descrição do movimento
CREATE INDEX idx_bank_movements_description_trgm
  ON "BankMovement"
  USING gin (description gin_trgm_ops);
