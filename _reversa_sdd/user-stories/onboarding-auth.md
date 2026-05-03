# User Stories - Onboarding e Auth

## US-AUTH-001 - Criar conta com workspace pessoal

Como novo usuário, quero criar uma conta com nome, e-mail, senha e tipo de perfil para iniciar o uso do WSP Finance.

### Critérios de Aceitação

- [CONFIRMADO] Dado nome com mínimo de 3 caracteres, e-mail válido e senha com mínimo de 6 caracteres, quando registro é enviado, então o sistema cria usuário, workspace pessoal e membership `OWNER`.
- [CONFIRMADO] Dado e-mail já cadastrado, quando registro é enviado, então o sistema rejeita com usuário existente.
- [CONFIRMADO] Dado registro bem-sucedido, então o sistema envia código de verificação e não emite tokens de sessão.

## US-AUTH-002 - Verificar e-mail antes do login

Como usuário registrado, quero confirmar meu e-mail com código para poder autenticar.

### Critérios de Aceitação

- [CONFIRMADO] Dado código válido não expirado, quando verifico a conta, então `emailVerifiedAt` é preenchido.
- [CONFIRMADO] Dado conta sem verificação, quando tento login, então o sistema bloqueia com e-mail não verificado.
- [CONFIRMADO] Dado e-mail inexistente no resend, então a resposta não revela enumeração.

## US-AUTH-003 - Manter sessão com refresh token rotacionado

Como usuário autenticado, quero continuar usando o app sem relogar manualmente enquanto meu refresh token for válido.

### Critérios de Aceitação

- [CONFIRMADO] Dado refresh token válido, quando frontend chama `/auth/refresh`, então backend retorna novo access token e novo refresh token.
- [CONFIRMADO] Dado refresh token usado, então ele é removido e substituído.
- [CONFIRMADO] Dado múltiplos `401`, então Axios serializa refresh e reexecuta a fila.

## US-AUTH-004 - Recuperar senha

Como usuário, quero receber código de recuperação e redefinir minha senha.

### Critérios de Aceitação

- [CONFIRMADO] Dado e-mail existente, quando solicito recuperação, então código de 6 dígitos expira em 15 minutos.
- [CONFIRMADO] Dado reset válido, então senha é atualizada e refresh tokens existentes são removidos.
- [CONFIRMADO] Dado e-mail inexistente, então forgot password responde silenciosamente.
