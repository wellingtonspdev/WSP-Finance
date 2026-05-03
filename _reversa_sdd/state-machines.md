# State Machines - WSP Finance

## User Verification

```mermaid
stateDiagram-v2
  [*] --> RegisteredUnverified: AuthService.register
  RegisteredUnverified --> Verified: VerificationService.verifyAccount
  RegisteredUnverified --> RegisteredUnverified: resend verification code
  Verified --> Authenticated: AuthService.authenticate
  Authenticated --> TokenRefreshed: AuthService.refreshToken
  TokenRefreshed --> Authenticated
```

| Estado | Regra | Confiança |
|---|---|---|
| `RegisteredUnverified` | `emailVerifiedAt` nulo impede login. | 🟢 |
| `Verified` | `emailVerifiedAt` preenchido permite autenticação. | 🟢 |
| `Authenticated` | access token + refresh token emitidos. | 🟢 |

## WorkspaceInvite

```mermaid
stateDiagram-v2
  [*] --> PENDING: createInvite
  PENDING --> ACCEPTED: acceptInvite double handshake
  PENDING --> REVOKED: revokeInvite
  PENDING --> REJECTED: rejectInvite
  PENDING --> EXPIRED: expiresAt ultrapassado
  ACCEPTED --> [*]
  REVOKED --> [*]
  REJECTED --> [*]
  EXPIRED --> [*]
```

| Transição | Gatilho | Confiança |
|---|---|---|
| `PENDING -> ACCEPTED` | token válido, status pending, não expirado e email do usuário logado igual ao convite. | 🟢 |
| `PENDING -> REVOKED` | revogação por workspace. | 🟢 |
| `PENDING -> REJECTED` | destinatário rejeita. | 🟢 |
| `PENDING -> EXPIRED` | regra por `expiresAt`; persistência explícita do status depende do service. | 🟡 |

## BankMovement

```mermaid
stateDiagram-v2
  [*] --> PENDING: OFX/Open Finance ingestion
  PENDING --> APPROVED: approve
  PENDING --> REJECTED: reject
  PENDING --> MERGED: merge discardIds
  MERGED --> [*]: delete discard rows
  APPROVED --> APPROVED: idempotent approve returns existing transaction
```

| Estado | Regra | Confiança |
|---|---|---|
| `PENDING` | staging sem impacto no saldo. | 🟢 |
| `APPROVED` | convertido em Transaction real; saldo atualizado. | 🟢 |
| `REJECTED` | descartado sem Transaction. | 🟢 |
| `MERGED` | status transitório nos descartes antes de delete físico. | 🟢 |

## Transaction Payment/Audit State

```mermaid
stateDiagram-v2
  [*] --> CreatedUnpaid: create isPaid=false
  [*] --> CreatedPaid: create isPaid=true
  CreatedPaid --> Deleted: delete transaction, reverse balance
  CreatedUnpaid --> Deleted: delete transaction, no balance reversal
  CreatedPaid --> FiscalLocked: date <= closedUntil
  CreatedUnpaid --> FiscalLocked: date <= closedUntil
```

🔴 **LACUNA**: o enum `TransactionStatus` sugere `PENDING -> COMPLETED -> RECONCILED`, mas a máquina completa de reconciliação não foi comprovada no código analisado.

## Fiscal Lock

```mermaid
stateDiagram-v2
  [*] --> OpenPeriod: closedUntil null or transactionDate > closedUntil
  [*] --> ClosedPeriod: transactionDate <= closedUntil
  ClosedPeriod --> AllowedBypass: userRole ACCOUNTANT and workspace BUSINESS
  ClosedPeriod --> Blocked: any other role or PERSONAL workspace
```

## Certificate A1

```mermaid
stateDiagram-v2
  [*] --> NotUploaded
  NotUploaded --> UploadedValid: upload .p12/.pfx and parse validity
  UploadedValid --> ExpiringSoon: expiresInDays inside warning window
  UploadedValid --> Expired: certificateExpiresAt < today
  ExpiringSoon --> UploadedValid: replace certificate
  Expired --> UploadedValid: replace certificate
```

🟢 **CONFIRMADO**: validade é extraída no backend e propagada para cache/badges. A janela visual exata é implementada no frontend por helpers de certificado.
