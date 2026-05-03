# Architecture Overview - WSP Finance

## Resumo

🟢 **CONFIRMADO**: WSP Finance é uma aplicação web full-stack com frontend React/Vite, backend Express/TypeScript, banco PostgreSQL via Prisma, isolamento multi-tenant por RLS, storage R2/S3 para anexos/certificados, integrações externas de dados brasileiros e pipelines CI com Vitest/Playwright/SonarCloud.

## Containers Principais

| Container | Tecnologia | Responsabilidade | Confiança |
|---|---|---|---|
| Frontend Web | React 19, Vite, TanStack Query, Zustand, Tailwind | UI de cliente/contador, sessão, workspace ativo, uploads diretos e inbox. | 🟢 |
| Backend API | Express, TypeScript, Prisma, Zod | API REST, auth, domínio financeiro, RBAC, ingestão, cache e Swagger. | 🟢 |
| PostgreSQL | PostgreSQL/Supabase | Dados transacionais, RLS, auditoria, staging e cache. | 🟢 |
| Object Storage | Cloudflare R2/S3 compatível | Anexos, comprovantes e certificados A1 via object key. | 🟢 |
| External APIs | BrasilAPI, ViaCEP, ReceitaWS, Open Finance webhook | Enriquecimento CNPJ/CEP e ingestão bancária. | 🟢 |
| CI/CD | GitHub Actions, SonarCloud, release-please | Testes, coverage, smoke Playwright e release. | 🟢 |

## Estilo Arquitetural

- 🟢 Backend modular por controllers, services e repositories.
- 🟢 Prisma extended client injeta contexto RLS com `set_config`.
- 🟢 Frontend usa rotas por workspace e interceptors Axios para `x-workspace-id`.
- 🟢 BankMovement funciona como staging antes de gerar Transaction.
- 🟢 AuditLog registra mutações monetárias e eventos sensíveis.

## Integrações

| Integração | Direção | Protocolo | Uso |
|---|---|---|---|
| Frontend -> Backend | saída frontend | HTTP JSON | API principal |
| Frontend -> R2/S3 | saída frontend | PUT presigned | upload direto de anexos |
| Backend -> R2/S3 | saída backend | AWS SDK S3 | presign, delete, upload seguro, download assinado |
| Backend -> PostgreSQL | saída backend | Prisma/PostgreSQL | persistência e RLS |
| Backend -> BrasilAPI | saída backend | HTTP JSON | CEP/CNPJ primário |
| Backend -> ViaCEP | saída backend | HTTP JSON | fallback CEP |
| Backend -> ReceitaWS | saída backend | HTTP JSON | fallback CNPJ |
| Open Finance -> Backend | entrada backend | HTTP webhook Bearer | movimentos bancários |
| Backend -> SMTP/Ethereal | saída backend | SMTP | e-mail transacional em ambiente analisado |

## Dívidas e Lacunas Técnicas

- 🔴 Rotas financeiras de escrita têm Auth + Workspace, mas nem sempre RBAC explícito.
- 🔴 Rotas externas CNPJ/CEP estão públicas.
- 🔴 OCR/WhatsApp, NFS-e, billing e exportação ERP aparecem no escopo, mas não foram comprovados como implementação completa.
- 🔴 Contrato `useExternalLocation` diverge do retorno backend (`address` aninhado).
- 🟡 Deploy de produção é inferido por escopo/CI; não há Dockerfile/docker-compose confirmado.
