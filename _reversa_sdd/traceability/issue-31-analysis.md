# Analise da Issue - WSP Finance

## Identificacao

- Issue: #31
- Link/referencia: S5-003-[STORAGE] ExportArchive + Snapshot R2 de Exportações Domínio
- Tipo: feature | hardening
- Prioridade: Alta
- Solicitante: Tech Lead / Product Owner
- Data: 2026-05-21
- Agente responsavel: Antigravity

## Resumo em uma frase

> Criar rastreabilidade física e operacional das exportações Domínio arquivando o Buffer gerado em um bucket privado do Cloudflare R2 e registrando os metadados em uma nova tabela `ExportArchive` e em `AuditLog` na mesma transação, preservando o download direto atual.

## Contexto da issue

- Descricao original: Atualmente o endpoint `/export/generate` gera o TXT Domínio e cria um AuditLog de exportação contábil, mas o arquivo é efêmero (não é guardado). A issue S5-003 pede a persistência física segura no R2 e a criação do model `ExportArchive` associado.
- Sintomas observados: O arquivo gerado é baixado mas não fica arquivado no sistema para futuras auditorias ou re-download seguro (histórico/rastreabilidade física não existia).
- Comportamento esperado: O Buffer gerado é enviado para o bucket R2 privado usando um objectKey opaco sem PII; na sequência, cria-se o `ExportArchive` e o `AuditLog` referenciando-o na mesma transação; finalmente, o Buffer é retornado para download direto. Se o upload R2 ou a transação DB falhar, não deve retornar 200 nem o arquivo, e sim um erro amigável 503 e realizar limpeza do arquivo órfão no R2 (compensação best-effort).
- Comportamento atual: Gera o Buffer, grava o AuditLog fora de uma transação com a entidade e retorna o arquivo diretamente.
- Usuarios/atores afetados: Contadores e administradores da plataforma (Accountants).
- Ambiente afetado: Backend API (`/export/generate`), Banco de dados PostgreSQL (Prisma), Cloudflare R2 Storage.

## Escopo

### Dentro do escopo

- [x] Criar model Prisma `ExportArchive`.
- [x] Criar migration aditiva habilidando RLS no PostgreSQL de acordo com o padrão do projeto.
- [x] Adaptar interface `IStorageProvider` e as classes `S3StorageProvider` e `LocalStorageProvider` para suportar upload de Buffer genérico com objectKey definido e deleteFile/deleteObject.
- [x] Criar `ExportArchiveService` para coordenar o upload, a transação no banco (criação de `ExportArchive` e `AuditLog`) e a compensação em caso de erro.
- [x] Integrar `ExportArchiveService` no `ExportController.generate` garantindo que erros de storage ou DB interrompam o fluxo com status 503 e sem download de falso sucesso.
- [x] Garantir que dados sensíveis (PII, TXT bruto, linhas 0000/6000/6100) não sejam armazenados no DB nem no `AuditLog`.
- [x] Escrever testes unitários e de integração (TDD-first) cobrindo todos os cenários felizes e de erro (falha R2, falha DB, etc.).

### Fora do escopo

- [x] Alteração do layout Domínio, Windows-1252, CRLF ou ausência de BOM.
- [x] Histórico de exportações em tela/frontend ou rota de re-download.
- [x] Geração de URLs presigned para visualização pública de exportações.
- [x] Alteração no `ExportService` (geração de conteúdo) a menos que haja um bug comprovado.
- [x] Outbox pattern ou processamento em filas complexas.
- [x] Limpeza automática de arquivos antigos (retention real).

### Suposicoes

- [x] O bucket R2 privado já existe e suas variáveis de ambiente estão configuradas.
- [x] O middleware de autenticação e de workspace já injetam corretamente `userId` e `workspaceId`.
- [x] O banco possui RLS ativo e as policies são aplicadas através do `app.current_workspace_id`.

### Lacunas que exigem confirmacao

- [x] Como o `AuditLogService` se comporta com o transaction client (`tx`). Confirmado que ele aceita um parâmetro `client` opcional.

## Documentacao Reversa consultada

- [x] `_reversa_sdd/sdd/uploads-storage.md`
- [x] `_reversa_sdd/sdd/rbac-rls.md`
- [x] `_reversa_sdd/permissions.md`

## Perguntas obrigatorias

- Qual problema real deve ser resolvido? Rastreabilidade física e operacional segura de exportações Domínio.
- Qual regra de negocio se aplica? Isolamento tenant via RLS, LGPD (sem PII em log/keys), retenção de 5 anos, sem falso sucesso.
- Existe decisao pendente em `questions.md`? Não aplicável.
- Existe gap conhecido em `gaps.md`? Não aplicável.
- Quais criterios de aceite sao testaveis? upload do buffer, transação DB atômica, compensação de falha no DB pós-upload, AuditLog sem objectKey e sem PII.
- O que nao deve ser alterado? O arquivo TXT gerado em si (layout, encoding, CRLF).

## Criterios de aceite

- [x] Model `ExportArchive` e migration aditiva criados e RLS habilitado.
- [x] upload do Buffer no R2 privado.
- [x] objectKey não contém PII (CNPJ, CPF, email, nome).
- [x] `ExportArchive` gravado com metadados coerentes (sha256, recordCount, sizeBytes, etc.).
- [x] `AuditLog` EXPORT criado na mesma transação referenciando `ExportArchive.id` no `entityId` e com `archiveId` no `newState`.
- [x] Falha no upload R2 impede criação de DB/Log e download.
- [x] Falha na gravação do DB pós-upload aciona remoção best-effort no R2 e retorna erro 503.
- [x] Sem uso de `sysPrisma` no fluxo.
- [x] Sem frontend alterado.

## Riscos iniciais

| Risco | Impacto | Como validar |
|---|---|---|
| Falha R2 mascarada | Alto (falso sucesso) | Teste simulando falha do StorageProvider e validando retorno do controller. |
| Gravação órfã no R2 | Médio (sujeira) | Teste simulando falha na transação DB pós-upload e validando chamada de deleteFile. |
| Vazamento de PII no R2/AuditLog | Alto (LGPD) | Validação do objectKey gerado e do newState no AuditLog. |
| Quebra de isolamento RLS | Crítico (vazamento) | Testes de integração simulando cross-tenant. |

## Resultado da etapa

- Status: pronto para analise tecnica
- Motivo: Escopo delimitado, regras absolutas entendidas.
- Proximo passo: Executar análise técnica do código atual.
