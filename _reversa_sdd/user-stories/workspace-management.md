# User Stories - Gestão de Workspace

## US-WS-001 - Criar workspace empresarial

Como usuário autenticado, quero criar um workspace empresarial para separar minha operação PJ.

### Critérios de Aceitação

- [CONFIRMADO] Dado nome válido, quando crio workspace, então o sistema cria workspace e membership `OWNER`.
- [CONFIRMADO] Dado CNAE iniciado por `620`, `6911` ou `7112`, então `taxRate` inferido é `6.00`.
- [CONFIRMADO] Dado CNAE iniciado por `5320`, então `taxRate` inferido é `0.00`.

## US-WS-002 - Selecionar workspace ativo

Como usuário com múltiplos workspaces, quero manter um workspace ativo para que as telas carreguem dados do contexto correto.

### Critérios de Aceitação

- [CONFIRMADO] Dado workspace salvo no storage e ainda presente nos memberships, quando app inicia, então ele é restaurado.
- [CONFIRMADO] Dado workspace salvo que não pertence mais ao usuário, então o primeiro workspace disponível é selecionado.
- [CONFIRMADO] Dado rota por workspace, então Axios envia `x-workspace-id`.

## US-WS-003 - Gerenciar membros e convites

Como `OWNER`, quero convidar e remover membros para controlar quem acessa o workspace.

### Critérios de Aceitação

- [CONFIRMADO] Dado usuário `OWNER`, quando convida e-mail ainda não membro, então convite `PENDING` é criado com token e expiração de 7 dias.
- [CONFIRMADO] Dado convite pendente duplicado, então novo convite é bloqueado.
- [CONFIRMADO] Dado convite aceito pelo e-mail correto, então membership é criado com a role do convite.
- [CONFIRMADO] Dado `OWNER` removendo outro membro, então vínculo é removido.
- [CONFIRMADO] Dado `OWNER` tentando remover a si mesmo, então operação é bloqueada.
