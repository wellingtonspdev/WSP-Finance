# C4 Context - WSP Finance

```mermaid
flowchart LR
  client["Cliente MEI/ME<br/>Usuário CLIENT"] -->|Web/App HTTP| wsp["WSP Finance"]
  accountant["Contador<br/>Usuário ACCOUNTANT"] -->|Web/App HTTP| wsp
  admin["Equipe técnica"] -->|CI, deploy, observabilidade| wsp

  wsp -->|SQL via Prisma + RLS| db["PostgreSQL / Supabase"]
  wsp -->|S3 API / Presigned URLs| r2["Cloudflare R2 / S3"]
  wsp -->|HTTP JSON| brasilapi["BrasilAPI"]
  wsp -->|HTTP JSON fallback| viacep["ViaCEP"]
  wsp -->|HTTP JSON fallback| receitaws["ReceitaWS"]
  openfinance["Open Finance Provider"] -->|Webhook Bearer JSON| wsp
  wsp -->|SMTP| email["E-mail Provider"]
  github["GitHub Actions"] -->|CI/Test/Release| wsp
  sonar["SonarCloud"] -->|Quality analysis| github
```

## Relações

| Origem | Destino | Relação | Confiança |
|---|---|---|---|
| Cliente | WSP Finance | gerencia workspace pessoal/empresa e transações. | 🟢 |
| Contador | WSP Finance | opera hub, inbox, convites e clientes. | 🟢 |
| WSP Finance | PostgreSQL | persiste domínio e aplica RLS. | 🟢 |
| WSP Finance | R2/S3 | armazena anexos e certificados. | 🟢 |
| WSP Finance | BrasilAPI/ViaCEP/ReceitaWS | busca dados externos. | 🟢 |
| Open Finance | WSP Finance | envia movimentos por webhook. | 🟢 |
