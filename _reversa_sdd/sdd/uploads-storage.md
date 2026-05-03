# SDD - Uploads e Storage

## Visão Geral

[CONFIRMADO] O componente `uploads-storage` cobre geração de URL presigned para upload direto, fallback local de desenvolvimento, quota por workspace, validação MIME, visualização assinada de anexos e storage seguro de certificados A1.

## Responsabilidades

- [CONFIRMADO] Gerar URL temporária de upload para anexos.
- [CONFIRMADO] Validar `fileName`, `contentType`, `folderType` e `fileSize`.
- [CONFIRMADO] Limitar arquivo a 10 MB no controller.
- [CONFIRMADO] Bloquear workspace acima de 1 GB de anexos.
- [CONFIRMADO] Montar object key com escopo `workspaces/{workspaceId}`.
- [CONFIRMADO] Gerar headers exigidos para PUT direto no storage.
- [CONFIRMADO] Gerar URL assinada de download por 5 minutos.
- [CONFIRMADO] Auditar visualização de anexo em background.
- [CONFIRMADO] Suportar storage seguro de certificado com SSE-C.

## Interface

| Método | Rota | Entrada | Saída | Confiança |
|---|---|---|---|---|
| `POST` | `/uploads/presigned` | `fileName`, `contentType`, `folderType`, `fileSize` | `uploadUrl`, `publicUrl`, `headers`, `key` | CONFIRMADO |
| `GET` | `/transactions/:id/attachment` | id da transação e workspace | `downloadUrl` e headers opcionais | CONFIRMADO |

## Regras de Negócio

- [CONFIRMADO] `/uploads/presigned` exige `AuthMiddleware`, `WorkspaceMiddleware` e rate limit de 10 requisições/minuto por IP.
- [CONFIRMADO] `folderType` aceita `AVATAR`, `RECEIPT`, `INVOICE`, `CERTIFICATE` ou `ASSET`.
- [CONFIRMADO] `fileSize` deve ser positivo e no máximo 10 MB.
- [CONFIRMADO] Quota acumulada de anexos do workspace é 1 GB.
- [CONFIRMADO] Quota excedida retorna erro com status `402`.
- [CONFIRMADO] Object key segue `workspaces/{workspaceId}/{folderType}/{yyyy-mm}/...`.
- [CONFIRMADO] Certificados usam caminho vault separado.
- [CONFIRMADO] Para certificado ou MIME PKCS12/PEM, provider exige `VAULT_MASTER_KEY` com mínimo de 32 caracteres.
- [CONFIRMADO] Visualização de anexo exige que a transação pertença ao workspace atual.
- [CONFIRMADO] `AttachmentPreview` faz `fetch(downloadUrl, { headers })`, cria blob local e revoga ao fechar.
- [CONFIRMADO] `LocalStorageProvider.generateUploadUrl` muda semântica de chave local ao gerar `Date.now()-filename`. [Revisão Reviewer]
- [CONFIRMADO] Handler local recebe `filename` da rota e grava em `uploads` sem autenticação nessa rota local; proteção depende do nome previamente gerado. [Revisão Reviewer]

## Fluxo Principal

1. [CONFIRMADO] Frontend solicita `POST /uploads/presigned`.
2. [CONFIRMADO] Backend valida autenticação, workspace e payload.
3. [CONFIRMADO] Service soma `Transaction.attachmentSize` do workspace.
4. [CONFIRMADO] Service valida quota e MIME.
5. [CONFIRMADO] Provider gera URL PUT temporária.
6. [CONFIRMADO] Frontend faz PUT direto no storage.
7. [CONFIRMADO] URL/metadata do anexo são associados à transação no fluxo financeiro.

## Critérios de Aceitação

```gherkin
Dado um arquivo válido abaixo de 10 MB e workspace abaixo da quota
Quando o frontend solicita URL presigned
Então o backend retorna URL, publicUrl e headers para upload direto

Dado um workspace acima de 1 GB de anexos
Quando o frontend solicita nova URL de upload
Então o backend bloqueia com status 402

Dado uma transação com anexo no workspace atual
Quando o usuário solicita visualização
Então o backend gera URL assinada de 5 minutos e registra auditoria
```

## Rastreabilidade de Código

| Arquivo | Cobertura |
|---|---|
| `backend/src/controllers/UploadController.ts` | validação HTTP de upload/visualização |
| `backend/src/services/UploadService.ts` | quota, object key, signed view |
| `backend/src/providers/IStorageProvider.ts` | contrato de storage |
| `backend/src/providers/S3StorageProvider.ts` | R2/S3, presign, SSE-C |
| `backend/src/providers/LocalStorageProvider.ts` | fallback local |
| `frontend/src/services/uploadCloudflare.ts` | PUT direto |
| `frontend/src/features/transactions/hooks/useAttachment.ts` | consumo de anexo |
| `frontend/src/features/transactions/components/AttachmentPreview.tsx` | renderização de anexo |
| `_reversa_sdd/flowcharts/uploads-storage*.md` | fluxos do módulo |
