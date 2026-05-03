# Perguntas para Validação - WSP-Finance

> Gerado pelo Revisor em 2026-05-03.
> Preencha o campo **Resposta** de cada pergunta e me avise quando terminar.

---

## Pergunta 1

**Contexto:** Módulo `workspaces` / certificado A1. A rota `POST /workspaces/:id/certificate-a1` exige `RbacMiddleware('OWNER')`, mas há regra de negócio possível em que o contador operacional poderia gerenciar certificado do cliente.
**Spec afetada:** `_reversa_sdd/sdd/workspaces.md`, `_reversa_sdd/sdd/uploads-storage.md`
**Pergunta:** Contadores com role `ACCOUNTANT` devem poder enviar/substituir certificado A1 de workspace empresarial ou essa ação deve continuar exclusiva de `OWNER`?
**Impacto:** Se contador puder gerenciar A1, a spec, matriz RBAC e user story de certificado precisam mudar; se não puder, a decisão será registrada como regra de produto confirmada.

**Resposta:** Decisao definitiva: a acao deve continuar exclusiva do `OWNER`.

A arquitetura estabelece que a rota `POST /workspaces/:id/certificate-a1` exige a cadeia `Auth + Workspace + RbacMiddleware('OWNER')`. O Hub do Contador, com perfil `ACCOUNTANT`, tem funcao de monitoramento via Health Check, visualizando status, pendencias e validade dos certificados. O contador nao deve gerenciar substituicao do arquivo A1 nem acessar senhas do cofre A1.

---

## Pergunta 2

**Contexto:** Módulos `auth` e `rbac-rls`. `AuthMiddleware` e serviços de token aceitam fallback `super-secret-key-change-me` quando `JWT_SECRET` não existe.
**Spec afetada:** `_reversa_sdd/sdd/auth.md`, `_reversa_sdd/sdd/rbac-rls.md`
**Pergunta:** Em produção, o backend deve falhar o startup quando `JWT_SECRET` estiver ausente, ou o fallback é aceitável em algum ambiente além de desenvolvimento/teste?
**Impacto:** Define se a lacuna vira regra operacional obrigatória e se deve entrar como requisito de hardening.

**Resposta:** Decisao definitiva: em producao, o backend deve falhar obrigatoriamente o startup quando `JWT_SECRET` estiver ausente.

Chaves secretas de fallback, como `super-secret-key-change-me`, sao proibidas em ambiente produtivo. O fallback so pode ser tolerado em cenarios isolados de desenvolvimento ou teste.

---

## Pergunta 3

**Contexto:** Módulo `auth`. Códigos de verificação de e-mail e reset de senha usam `Math.random`.
**Spec afetada:** `_reversa_sdd/sdd/auth.md`
**Pergunta:** Os códigos OTP devem ser considerados material sensível que exige gerador criptográfico (`crypto`) ou o uso atual é aceitável para o nível de risco do produto?
**Impacto:** Define se a spec deve registrar `Math.random` como dívida de segurança obrigatória ou apenas como observação técnica.

**Resposta:** Decisao definitiva: os codigos OTP sao material sensivel e exigem gerador criptografico.

O uso atual de `Math.random` foi classificado como divida de seguranca obrigatoria. Para o nivel de risco de um produto financeiro, os codigos de verificacao de e-mail e reset de senha devem usar biblioteca criptograficamente segura, como o modulo nativo `crypto` do Node.js.

---

## Pergunta 4

**Contexto:** Módulo `auth`. O provider de e-mail analisado usa Ethereal, típico de desenvolvimento/teste.
**Spec afetada:** `_reversa_sdd/sdd/auth.md`
**Pergunta:** Qual é o provider de e-mail produtivo esperado para verificação e reset de senha?
**Impacto:** Permite completar a spec de operação produtiva e diferenciar comportamento dev/teste de produção.

**Resposta:** Decisao definitiva: Ethereal e apenas simulador de desenvolvimento.

Para o MVP em producao, o sistema deve usar provedor SMTP transacional real e seguro. As opcoes validadas pela arquitetura sao Amazon SES, SendGrid ou Resend.

---

## Pergunta 5

**Contexto:** Módulo `external-data`. As rotas `/external/document/:cnpj` e `/external/location/:cep` não usam `AuthMiddleware`.
**Spec afetada:** `_reversa_sdd/sdd/external-data.md`, `_reversa_sdd/sdd/rbac-rls.md`
**Pergunta:** Consultas CNPJ/CEP devem ser públicas ou devem exigir autenticação/rate limit por usuário/workspace?
**Impacto:** Define requisito de segurança/custo para providers externos e atualiza OpenAPI, RBAC e user stories.

**Resposta:** Decisao definitiva: consultas CNPJ/CEP nao devem ser publicas.

As rotas `/external/document/:cnpj` e `/external/location/:cep` devem exigir `AuthMiddleware` e rate limiting por usuario/workspace. A decisao protege o sistema contra abuso e estouro de custos em provedores externos como BrasilAPI, ViaCEP e ReceitaWS.

---

## Pergunta 6

**Contexto:** Módulo `imports-open-finance`. `OpenFinanceWebhookService` usa fallback `webhook-auth-key-mock` quando `OPEN_FINANCE_WEBHOOK_KEY` está ausente.
**Spec afetada:** `_reversa_sdd/sdd/imports-open-finance.md`
**Pergunta:** O webhook Open Finance deve falhar quando `OPEN_FINANCE_WEBHOOK_KEY` não estiver configurada, ou o fallback mock é permitido em algum ambiente específico?
**Impacto:** Define requisito de hardening e comportamento por ambiente para integrações bancárias.

**Resposta:** Decisao definitiva: o webhook Open Finance deve falhar a subida do servico quando `OPEN_FINANCE_WEBHOOK_KEY` nao estiver configurada.

A chave simulada `webhook-auth-key-mock` so e permitida em ambientes de desenvolvimento ou teste, de forma explicitamente isolada. Em producao, fallback mock para integracao bancaria e proibido.

---

## Pergunta 7

**Contexto:** Módulo `accountant`. `AccountantHubPage` renderiza `mockEvents` no feed lateral.
**Spec afetada:** `_reversa_sdd/sdd/accountant.md`
**Pergunta:** O feed lateral do hub contador é apenas protótipo temporário ou deve existir um feed real persistido/auditável no backend?
**Impacto:** Se for produto real, será necessário especificar entidade/endpoint/eventos; se for protótipo, a spec marcará como UI temporária fora do domínio principal.

**Resposta:** Decisao definitiva: os `mockEvents` da `AccountantHubPage` sao apenas prototipo temporario.

Como o Hub do Contador e focado em gestao por excecao, os eventos operacionais exibidos no feed lateral devem ser dados reais, persistidos e auditaveis no backend, possivelmente alimentados por `AuditLog` ou notificacoes sistemicas. Mocks nao podem permanecer na versao final do MVP.

---

## Pergunta 8

**Contexto:** Módulo `finance-core`. Prisma define `Transaction.id` como UUID string, mas vários tipos/componentes frontend usam `number`.
**Spec afetada:** `_reversa_sdd/sdd/finance-core.md`, `_reversa_sdd/sdd/frontend-shell.md`
**Pergunta:** O contrato oficial de `Transaction.id` deve ser string UUID em todas as camadas?
**Impacto:** Confirma se a correção esperada é alinhar frontend para `string`, atualizar OpenAPI e revisar chamadas de edit/delete/attachment.

**Resposta:** Decisao definitiva: sim, o contrato oficial de `Transaction.id` e `string UUID` em todas as camadas.

A modelagem Prisma define a chave primaria da transacao financeira como UUID por decisao de seguranca contra enumeracao. O frontend deve ser refatorado para abandonar qualquer tipagem conflituosa que trate esse identificador como `number`.
