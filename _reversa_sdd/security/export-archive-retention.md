# Política MVP de Retenção — ExportArchive

## Status

Política técnica MVP inicial. Não representa parecer jurídico final.

Revisão jurídica obrigatória antes de produção real.

## Escopo

Aplica-se aos arquivos de exportação contábil armazenados em `ExportArchive` com snapshot físico no R2 (Cloudflare).

## Retenção MVP

Para o MVP, cada `ExportArchive` recebe:

```
retentionUntil = createdAt + 5 anos
```

Essa regra é uma **decisão técnica inicial** para rastreabilidade e guarda de exportações contábeis, sujeita a revisão jurídica antes de produção real.

### Cálculo

```typescript
const retentionUntil = new Date(createdAt);
retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);
```

- Campo `retentionUntil` é `NOT NULL` na tabela `ExportArchive`.
- O cálculo é feito no momento da criação do registro, dentro da transação de `archiveAndLog()`.

## O que esta issue NÃO implementa

- **Expurgo físico automático no R2** — não existe job de lifecycle ou cleanup.
- **Política jurídica final de retenção** — a definição de 5 anos é técnica, não jurídica.
- **Backfill de logs antigos** — logs de exportação anteriores à existência de `ExportArchive` não são retroativamente associados.
- **Lifecycle automático de bucket** — nenhuma regra R2/S3 lifecycle foi configurada.
- **Tela de gestão de retenção** — não existe interface para gerenciar políticas de retenção.

## AuditLog — Metadados Permitidos

O `AuditLog` associado a exportações (`AuditAction.EXPORT`) registra apenas metadados seguros:

| Campo          | Tipo     | Descrição                                      |
|----------------|----------|-------------------------------------------------|
| `archiveId`    | string   | UUID do `ExportArchive` criado                  |
| `layoutId`     | string   | Identificador do layout de exportação           |
| `targetSystem` | string   | Sistema-alvo (ex: `DOMINIO`)                    |
| `periodStart`  | string   | Data início do período exportado (ISO 8601)     |
| `periodEnd`    | string   | Data fim do período exportado (ISO 8601)        |
| `recordCount`  | number   | Quantidade de registros no arquivo              |
| `warningsCount`| number   | Quantidade de avisos gerados na exportação      |
| `fileHash`     | string   | SHA-256 do conteúdo do arquivo                  |
| `fileName`     | string   | Nome seguro gerado pelo sistema (ex: `wsp-dominio-2026-05-01_2026-05-31.txt`) |

### Implementação

A função `buildExportAuditNewState()` em `AuditLogService.ts` usa uma **allowlist explícita** — apenas os campos acima são extraídos do input, qualquer campo extra é descartado silenciosamente.

## AuditLog — Dados Proibidos

O `AuditLog` **NÃO deve registrar**:

- `objectKey` — chave interna do storage (R2/S3/local)
- TXT bruto — conteúdo do arquivo exportado
- Linhas `6100|` — registros contábeis completos
- Descrições completas de lançamentos
- CPF/CNPJ desnecessário
- E-mail ou nome de cliente
- `bucket`, `path`, `internalPath`, `storagePath`
- `rawPayload` ou payloads extensos
- Qualquer dado que permita reconstruir o conteúdo exportado

### Referência via archiveId

O `AuditLog` referencia o arquivo exportado via `archiveId` e `entityId`, nunca via `objectKey`. Para acessar o arquivo físico, consulte `ExportArchive.objectKey` com a autorização adequada.

## Acesso e Segurança

### Tenant Isolation

- `ExportArchive` é **tenant-scoped** — cada registro pertence a um `workspaceId`.
- RLS (Row-Level Security) está habilitada via `app.current_workspace_id`.
- A policy PostgreSQL usa `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.

### Re-download

- Re-download usa `archiveId + workspaceId` para lookup tenant-scoped.
- O endpoint `GET /workspaces/:workspaceId/exports/:archiveId/download` não retorna `objectKey`, `bucket`, `buffer`, `base64` ou paths internos.
- O `objectKey` é validado contra padrão canônico antes de gerar presigned URL.
- O segmento workspace do `objectKey` é comparado com o `workspaceId` da requisição.

### RBAC

- `OWNER` e `ACCOUNTANT` são autorizados a re-download.
- `EDITOR` e `VIEWER` são bloqueados (403).
- Não-membros são bloqueados (403).

### Presigned URL

- TTL máximo: **900 segundos** (15 minutos).
- Provider de storage não é chamado em 401/403/404.
- Provider de storage não é chamado em tentativa cross-tenant.

## Próximos Passos (Follow-up)

1. **Revisão jurídica** — obter parecer jurídico sobre período de retenção adequado (LGPD, legislação contábil, requisitos do cliente).
2. **Job de expurgo** — implementar cleanup automatizado para registros com `retentionUntil` expirado.
3. **Lifecycle R2** — configurar lifecycle rules no bucket para expiração automática.
4. **Auditoria de acesso** — registrar no AuditLog cada re-download de exportação.
5. **Gestão de retenção** — interface administrativa para visualização/alteração de políticas.
