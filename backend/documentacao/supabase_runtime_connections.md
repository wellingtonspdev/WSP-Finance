# Hardening Prisma + Supabase (Pooler vs Migrations)

O Supabase no plano Free permite um pool bem estrito da porta nativa e pgbouncers restritos.

### .ENV Split
A API Node utiliza o padrão duplo:
- **DATABASE_URL**: Roteada para a porta interna de pooling (V4 usa a porta 6543 do Supavisor). Usada ativamente em runtime na API com alto limite de requests multiplexados. Foi injetado `?connection_limit=1&pgbouncer=true` limitando na raiz o slot do Prisma client node.
- **DIRECT_URL**: Roteada explícita à porta nativa 5432. Deve ser usada de forma pura para os scripts do Prisma (por trás dos panos o cli lê directUrl quando invocamos `prisma migrate`).

### Hardening / Enforcement de RLS
Para que os dados dos tenants estejam seguros através de RLS (zero-trust cross tenant leak), é imperativo que a Node API logue como uma role puramente sem o perfil BypassRLS e Superuser (ex: postgres padrão tem superuser; devemos utilizar/moderar uma role alternativa, ou certificar que os grants da role logada sejam read/write puras). 
A inicialização do servidor executa um *Fail-Fast Runtime Query* verificando se o PostgreSQL Current Role carrega tais atributos. Se verídico, ele quebra intencionalmente com `process.exit(1)`.

> **NOTA:** Escalando pro Render, `PRISMA_CONNECTION_LIMIT=3` é ideal para 1 CPU Node servindo requisições na borda, dividindo o pool de DB restante confortavelmente com a API.
