const fs = require('fs');
const path = require('path');
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const outputFile = './src/swagger-output.json';
const routes = ['./src/routes.ts'];

const bearerSecurity = [{ bearerAuth: [] }];
const bearerWorkspaceSecurity = [{ bearerAuth: [], WorkspaceHeader: [] }];
const uuidSchema = { type: 'string', format: 'uuid' };

const jsonBody = (schema) => ({
    required: true,
    content: {
        'application/json': {
            schema
        }
    }
});

const binaryBody = (contentType) => ({
    required: true,
    content: {
        [contentType]: {
            schema: {
                type: 'string',
                format: 'binary'
            }
        }
    }
});

const response = (description, schema) => ({
    description,
    ...(schema ? {
        content: {
            'application/json': {
                schema
            }
        }
    } : {})
});

const doc = {
    info: {
        title: 'API WSP Finance',
        version: '1.0.0',
        description: [
            'API para gestao financeira hibrida com autenticacao, workspaces, operacao financeira, uploads e fila de aprovacao.',
            '',
            'Como usar esta documentacao:',
            '- O resumo explica o resultado esperado da rota.',
            '- A descricao explica o que a rota faz e por que ela existe no fluxo do produto.',
            '- Rotas protegidas usam JWT bearer token.',
            '- Rotas de workspace tambem exigem o cabecalho x-workspace-id.'
        ].join('\n')
    },
    servers: [
        {
            url: 'http://localhost:3333',
            description: 'Servidor de desenvolvimento local'
        }
    ],
    tags: [
        { name: 'Autenticacao', description: 'Entrada, renovacao de sessao e leitura do perfil autenticado.' },
        { name: 'Recuperacao', description: 'Recuperacao de acesso via envio e validacao de codigo por e-mail.' },
        { name: 'Integracoes', description: 'Consulta de dados externos para acelerar cadastros.' },
        { name: 'Webhooks', description: 'Entradas assincronas vindas de integracoes externas.' },
        { name: 'Perfil do Usuario', description: 'Dados cadastrais globais do usuario autenticado.' },
        { name: 'Workspaces', description: 'Ambientes de trabalho pessoais ou empresariais associados ao usuario.' },
        { name: 'Convites', description: 'Gestao do ciclo de vida de convites e membros.' },
        { name: 'Categorias', description: 'Catalogo de classificacao financeira por workspace.' },
        { name: 'Contas', description: 'Contas bancarias, caixas e carteiras usadas no controle financeiro.' },
        { name: 'Transacoes', description: 'Lancamentos financeiros e consultas de extrato.' },
        { name: 'Dashboard', description: 'Indicadores consolidados para visao gerencial.' },
        { name: 'Uploads', description: 'Reserva de upload e consulta de anexos.' },
        { name: 'Bridge', description: 'Transferencias internas entre workspaces do mesmo usuario.' },
        { name: 'Importacao', description: 'Importacao de extratos e arquivos operacionais.' },
        { name: 'Accountant', description: 'Operacoes globais do contador, incluindo cache materializado do hub.' },
        { name: 'Inbox Aprovacao', description: 'Triagem de movimentos antes de virarem transacoes definitivas.' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            },
            WorkspaceHeader: {
                type: 'apiKey',
                in: 'header',
                name: 'x-workspace-id',
                description: 'ID do workspace ativo no qual a operacao sera executada.'
            }
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Operacao nao permitida.' }
                }
            },
            ValidationError: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'validation_error' },
                    message: { type: 'string', example: 'Erro de validacao nos dados enviados.' },
                    issues: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Required' },
                                path: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    example: ['email']
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

Object.assign(doc.components.securitySchemes, {
    WebhookAuthorization: {
        type: 'apiKey',
        in: 'header',
        name: 'authorization',
        description: 'Token compartilhado com o provedor Open Finance para autenticar o webhook.'
    }
});

Object.assign(doc.components.schemas, {
    MessageResponse: {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Operacao realizada com sucesso.' }
        }
    },
    TokenPair: {
        type: 'object',
        properties: {
            token: { type: 'string', example: 'jwt-token' },
            refreshToken: { type: 'string', format: 'uuid' }
        }
    },
    CursorPage: {
        type: 'object',
        properties: {
            items: { type: 'array', items: { type: 'object' } },
            nextCursor: { type: 'string', nullable: true, format: 'uuid' }
        }
    }
});

const op = (tag, summary, description) => ({
    tags: [tag],
    summary,
    description
});

const pathParam = (name, description, schema) => ({
    in: 'path',
    name,
    required: true,
    description,
    schema
});

const queryParam = (name, description, schema) => ({
    in: 'query',
    name,
    required: false,
    description,
    schema
});

const publicSecurity = [];
const webhookSecurity = [{ WebhookAuthorization: [] }];

const PUBLIC_ROUTES = new Set([
    '/auth/register',
    '/auth/session',
    '/auth/refresh',
    '/auth/verify',
    '/auth/resend-verification',
    '/password/forgot',
    '/password/reset',
    '/external/document/{cnpj}',
    '/external/location/{cep}',
    '/uploads/{filename}'
]);

const WORKSPACE_ROUTES = new Set([
    '/workspaces/{id}/invites',
    '/workspaces/{id}/invites/{inviteId}/revoke',
    '/workspaces/{id}/members',
    '/workspaces/{id}/members/{userId}',
    '/workspaces/{id}/invites',
    '/categories',
    '/categories/{id}',
    '/accounts',
    '/accounts/{id}',
    '/transactions',
    '/transactions/{id}',
    '/transactions/{id}/attachment',
    '/dashboard/summary',
    '/uploads/presigned',
    '/transactions/import',
    '/bank-movements',
    '/bank-movements/{id}/merge',
    '/bank-movements/{id}/approve',
    '/bank-movements/{id}/reject'
]);

const SECURITY_SCHEMES = {
    bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
    },
    WorkspaceHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-workspace-id',
        description: 'ID do workspace ativo no qual a operacao sera executada.'
    },
    WebhookAuthorization: {
        type: 'apiKey',
        in: 'header',
        name: 'authorization',
        description: 'Token compartilhado com o provedor Open Finance para autenticar o webhook.'
    }
};

const COMPONENT_SCHEMAS = {
    ErrorResponse: {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Operacao nao permitida.' }
        }
    },
    ValidationError: {
        type: 'object',
        properties: {
            status: { type: 'string', example: 'validation_error' },
            message: { type: 'string', example: 'Erro de validacao nos dados enviados.' },
            issues: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Required' },
                        path: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['email']
                        }
                    }
                }
            }
        }
    },
    MessageResponse: {
        type: 'object',
        properties: {
            message: { type: 'string', example: 'Operacao realizada com sucesso.' }
        }
    },
    TokenPair: {
        type: 'object',
        properties: {
            token: { type: 'string', example: 'jwt-token' },
            refreshToken: { type: 'string', format: 'uuid' }
        }
    },
    CursorPage: {
        type: 'object',
        properties: {
            items: { type: 'array', items: { type: 'object' } },
            nextCursor: { type: 'string', format: 'uuid', nullable: true }
        }
    }
};

const OPERATION_METADATA = {
    'post /auth/register': op('Autenticacao', 'Criar conta e iniciar onboarding', 'Cria um novo usuario, registra a credencial inicial e dispara o fluxo de verificacao por e-mail. Esta rota existe para abrir o primeiro acesso com um cadastro minimo e seguro.'),
    'post /auth/session': op('Autenticacao', 'Autenticar usuario e abrir sessao', 'Valida e-mail e senha e retorna os tokens da sessao autenticada. Esta rota existe para transformar credenciais em uma sessao reutilizavel pelo frontend e pelo Swagger.'),
    'patch /auth/refresh': op('Autenticacao', 'Renovar sessao sem novo login', 'Recebe um refresh token valido e devolve uma sessao atualizada. Esta rota existe para reduzir atrito do usuario sem pedir senha a cada expiracao do token curto.'),
    'post /auth/verify': op('Autenticacao', 'Confirmar codigo de verificacao', 'Ativa a conta apos a validacao do codigo enviado por e-mail. Esta rota existe para impedir acesso com e-mails nao comprovados.'),
    'post /auth/resend-verification': op('Autenticacao', 'Reenviar codigo de verificacao', 'Gera e envia um novo codigo para o e-mail informado. Esta rota existe para recuperar o onboarding quando o codigo anterior expirou ou nao chegou.'),
    'get /auth/me': op('Autenticacao', 'Ler perfil da sessao atual', 'Retorna os dados do usuario autenticado e suas memberships. Esta rota existe para hidratar o frontend apos login, refresh ou recarga da pagina.'),
    'post /password/forgot': op('Recuperacao', 'Solicitar recuperacao de senha', 'Recebe um e-mail e inicia o envio do codigo de redefinicao. Esta rota existe para recuperar o acesso sem expor se o e-mail esta cadastrado.'),
    'post /password/reset': op('Recuperacao', 'Definir nova senha com codigo', 'Valida o codigo de recuperacao e grava uma nova senha. Esta rota existe para concluir o fluxo de retomada de acesso com prova de posse do e-mail.'),
    'post /api/webhooks/open-finance': op('Webhooks', 'Receber movimentos do Open Finance', 'Recebe lotes de movimentos bancarios vindos de uma integracao externa autenticada por token compartilhado. Esta rota existe para alimentar a fila de conciliacao sem depender de importacao manual.'),
    'get /external/document/{cnpj}': op('Integracoes', 'Consultar dados de CNPJ', 'Busca dados cadastrais de empresa a partir do CNPJ informado. Esta rota existe para acelerar o cadastro de workspaces empresariais e reduzir digitacao manual.'),
    'get /external/location/{cep}': op('Integracoes', 'Consultar endereco por CEP', 'Busca endereco completo a partir de um CEP. Esta rota existe para autopreencher enderecos e diminuir erros de cadastro.'),
    'put /users/profile': op('Perfil do Usuario', 'Atualizar dados globais do usuario', 'Atualiza telefone, documento e endereco do usuario autenticado. Esta rota existe para manter o cadastro base do usuario consistente em qualquer workspace.'),
    'get /workspaces': op('Workspaces', 'Listar workspaces acessiveis', 'Retorna todos os workspaces vinculados ao usuario autenticado. Esta rota existe para montar a troca de contexto entre ambiente pessoal, empresarial e contabil.'),
    'post /workspaces': op('Workspaces', 'Criar novo workspace', 'Cria um workspace pessoal ou empresarial e o vincula ao usuario atual. Esta rota existe para abrir um novo espaco de operacao financeira dentro da conta.'),
    'put /workspaces/{id}': op('Workspaces', 'Atualizar metadados do workspace', 'Atualiza nome e tipo do workspace informado. Esta rota existe para manter o contexto organizacional alinhado com a operacao real.'),
    'post /workspaces/{id}/invites': op('Convites', 'Gerar convite de acesso ao workspace', 'Cria um convite para que outra pessoa entre no workspace com uma role especifica. Esta rota existe para compartilhar a operacao com contador, editor ou visualizador sem compartilhar senha.'),
    'post /workspaces/{id}/invites/{inviteId}/revoke': op('Convites', 'Revogar convite pendente', 'Invalida um convite antes de ele ser aceito. Esta rota existe para cortar acesso antes da entrada efetiva quando um convite foi enviado por engano ou ficou exposto.'),
    'post /invites/accept': op('Convites', 'Aceitar convite recebido', 'Consome o token do convite e cria a membership correspondente. Esta rota existe para transformar um convite externo em acesso real ao workspace.'),
    'get /invites/received': op('Convites', 'Listar convites recebidos', 'Retorna os convites direcionados ao usuario logado. Esta rota existe para centralizar as pendencias de entrada em workspaces de terceiros.'),
    'post /invites/{id}/reject': op('Convites', 'Recusar convite recebido', 'Marca um convite como rejeitado sem criar membership. Esta rota existe para dar ao destinatario controle explicito sobre o acesso oferecido.'),
    'get /workspaces/{id}/members': op('Convites', 'Listar membros do workspace', 'Retorna quem atualmente possui acesso ao workspace. Esta rota existe para auditoria operacional e gestao de permissoes.'),
    'get /workspaces/{id}/invites': op('Convites', 'Listar convites emitidos pelo workspace', 'Retorna o historico de convites criados para o workspace. Esta rota existe para acompanhar quem foi convidado, por qual papel e em qual status.'),
    'delete /workspaces/{id}/members/{userId}': op('Convites', 'Remover membro do workspace', 'Remove o acesso de um membro existente. Esta rota existe para desligamento, troca de contador ou ajuste de governanca do ambiente.'),
    'get /categories': op('Categorias', 'Listar categorias financeiras', 'Retorna as categorias disponiveis no workspace ativo. Esta rota existe para classificar entradas e saidas com consistencia.'),
    'post /categories': op('Categorias', 'Criar categoria personalizada', 'Cria uma nova categoria do workspace. Esta rota existe para adaptar a classificacao financeira ao jeito real de operar do cliente.'),
    'delete /categories/{id}': op('Categorias', 'Excluir categoria customizada', 'Remove uma categoria que nao deve mais ser usada. Esta rota existe para manter o catalogo limpo sem afetar categorias globais protegidas.'),
    'get /accounts': op('Contas', 'Listar contas e carteiras', 'Retorna as contas financeiras do workspace ativo. Esta rota existe para compor saldos, filtros e lancamentos vinculados a origem do dinheiro.'),
    'post /accounts': op('Contas', 'Cadastrar nova conta financeira', 'Cria uma conta bancara, caixa ou carteira com saldo inicial. Esta rota existe para iniciar o controle financeiro por origem de recurso.'),
    'put /accounts/{id}': op('Contas', 'Atualizar dados principais da conta', 'Atualiza nome, tipo e participacao no total da conta informada. Esta rota existe para manter a apresentacao e o comportamento da conta coerentes com a operacao.'),
    'patch /accounts/{id}': op('Contas', 'Atualizar parcialmente uma conta', 'Aplica ajustes pontuais em uma conta sem recriar o registro. Esta rota existe para permitir manutencao incremental da configuracao financeira.'),
    'delete /accounts/{id}': op('Contas', 'Excluir conta do workspace', 'Remove uma conta que nao deve mais participar da operacao. Esta rota existe para encerrar fontes de saldo sem manter cadastros obsoletos.'),
    'get /transactions/all': op('Transacoes', 'Listar transacoes de todos os workspaces do usuario', 'Retorna uma visao agregada das transacoes acessiveis ao usuario. Esta rota existe para auditoria pessoal e consultas globais sem trocar de contexto.'),
    'get /transactions': op('Transacoes', 'Consultar extrato do workspace', 'Lista as transacoes do workspace ativo com filtros por periodo, conta, categoria, tipo e pagina. Esta rota existe para alimentar extrato, relatorios e buscas operacionais.'),
    'post /transactions': op('Transacoes', 'Criar transacao manual', 'Cria um lancamento financeiro e ajusta os efeitos necessarios no saldo associado. Esta rota existe para registrar receitas, despesas e eventos financeiros nao importados automaticamente.'),
    'delete /transactions/{id}': op('Transacoes', 'Excluir transacao', 'Remove uma transacao e desfaz seus efeitos financeiros associados. Esta rota existe para corrigir erros de lancamento e manter o saldo reconciliado.'),
    'get /transactions/{id}/attachment': op('Uploads', 'Gerar link de visualizacao do anexo', 'Retorna uma URL assinada para visualizar o comprovante vinculado a uma transacao. Esta rota existe para expor o arquivo com seguranca e tempo de acesso controlado.'),
    'get /dashboard/summary': op('Dashboard', 'Gerar resumo gerencial do workspace', 'Consolida indicadores e recortes do periodo informado. Esta rota existe para alimentar a visao executiva sem o frontend recalcular saldos e totais.'),
    'post /uploads/presigned': op('Uploads', 'Reservar upload de arquivo', 'Valida metadados do arquivo e devolve a instrucao de upload. Esta rota existe para controlar tamanho, destino e custo antes da transferencia do binario.'),
    'put /uploads/{filename}': op('Uploads', 'Receber arquivo em modo local', 'Recebe o binario diretamente no ambiente local de desenvolvimento. Esta rota existe apenas para simular o fluxo de upload quando nao ha armazenamento externo ativo.'),
    'post /bridge/transfer': op('Bridge', 'Transferir valores entre workspaces', 'Cria uma transferencia interna entre dois workspaces do mesmo usuario. Esta rota existe para refletir movimentacoes como pro-labore e repasses internos sem duplicidade manual.'),
    'post /transactions/import': op('Importacao', 'Importar extrato OFX', 'Processa um arquivo OFX previamente enviado e converte seus movimentos. Esta rota existe para acelerar a entrada de dados bancarios historicos sem digitacao manual.'),
    'post /accountant/cache/refresh': op('Accountant', 'Forcar atualizacao do cache do contador', 'Atualiza sob demanda o cache materializado dos KPIs do contador autenticado e retorna o dashboardCache atualizado. Esta rota existe para permitir refresh manual quando o Hub sinaliza dados desatualizados.'),
    'get /accountant/bank-movements/pending': op('Inbox Aprovacao', 'Listar pendencias globais do contador', 'Retorna movimentos pendentes de todos os workspaces onde o usuario atua como contador. Esta rota existe para concentrar a fila operacional contabil em um unico painel.'),
    'get /bank-movements': op('Inbox Aprovacao', 'Listar pendencias do workspace atual', 'Retorna movimentos ainda nao aprovados no workspace ativo. Esta rota existe para a triagem antes da conversao em transacoes definitivas.'),
    'post /bank-movements/{id}/merge': op('Inbox Aprovacao', 'Mesclar movimentos duplicados', 'Consolida varios movimentos em um registro principal. Esta rota existe para tratar duplicidades antes da aprovacao contabil.'),
    'post /bank-movements/{id}/approve': op('Inbox Aprovacao', 'Aprovar movimento e gerar transacao', 'Transforma um movimento pendente em transacao oficial. Esta rota existe para fechar a conciliacao entre ingestao bancaria e lancamento financeiro confiavel.'),
    'post /bank-movements/{id}/reject': op('Inbox Aprovacao', 'Rejeitar movimento pendente', 'Marca um movimento como rejeitado sem gerar transacao. Esta rota existe para descartar ruido, duplicidade ou entrada indevida na fila de aprovacao.')
};

const REQUEST_BODIES = {
    'post /auth/register': jsonBody({
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
            name: { type: 'string', example: 'Maria Silva' },
            email: { type: 'string', format: 'email', example: 'maria@empresa.com' },
            password: { type: 'string', format: 'password', example: 'senha123' },
            type: { type: 'string', enum: ['CLIENT', 'ACCOUNTANT'], default: 'CLIENT' }
        }
    }),
    'post /auth/session': jsonBody({
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email', example: 'maria@empresa.com' },
            password: { type: 'string', format: 'password', example: 'senha123' }
        }
    }),
    'patch /auth/refresh': jsonBody({
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: { type: 'string', format: 'uuid' }
        }
    }),
    'post /auth/verify': jsonBody({
        type: 'object',
        required: ['email', 'code'],
        properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' }
        }
    }),
    'post /auth/resend-verification': jsonBody({
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email' }
        }
    }),
    'post /password/forgot': jsonBody({
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email' }
        }
    }),
    'post /password/reset': jsonBody({
        type: 'object',
        required: ['email', 'code', 'newPassword'],
        properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
            newPassword: { type: 'string', format: 'password', minLength: 6 }
        }
    }),
    'post /api/webhooks/open-finance': jsonBody({
        type: 'object',
        required: ['workspaceId', 'accountId', 'movements'],
        properties: {
            source: { type: 'string', enum: ['OPEN_FINANCE'], default: 'OPEN_FINANCE' },
            workspaceId: { type: 'integer', minimum: 1 },
            accountId: { type: 'integer', minimum: 1 },
            movements: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['date', 'description', 'amount'],
                    properties: {
                        transactionId: { type: 'string', nullable: true },
                        date: { type: 'string', example: '2026-04-13' },
                        description: { type: 'string', example: 'Pagamento recebido' },
                        amount: { oneOf: [{ type: 'string' }, { type: 'number' }], example: '150.90' }
                    }
                }
            }
        }
    }),
    'put /users/profile': jsonBody({
        type: 'object',
        properties: {
            cpf: { type: 'string', example: '12345678900' },
            phone: { type: 'string', example: '11999999999' },
            address: {
                type: 'object',
                properties: {
                    zipCode: { type: 'string', example: '01001000' },
                    street: { type: 'string', example: 'Rua Exemplo' },
                    number: { type: 'string', example: '100' },
                    complement: { type: 'string', example: 'Sala 12' },
                    neighborhood: { type: 'string', example: 'Centro' },
                    city: { type: 'string', example: 'Sao Paulo' },
                    state: { type: 'string', example: 'SP' }
                }
            }
        }
    }),
    'post /workspaces': jsonBody({
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', example: 'Empresa XPTO' },
            type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'], default: 'PERSONAL' },
            fiscalIdentity: {
                type: 'object',
                properties: {
                    documentType: { type: 'string', enum: ['CPF', 'CNPJ'] },
                    document: { type: 'string', example: '12345678000190' },
                    cnae: { type: 'string', nullable: true, example: '6201501' }
                }
            },
            address: {
                type: 'object',
                properties: {
                    zipCode: { type: 'string' },
                    street: { type: 'string' },
                    number: { type: 'string' },
                    complement: { type: 'string' },
                    neighborhood: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' }
                }
            }
        }
    }),
    'put /workspaces/{id}': jsonBody({
        type: 'object',
        required: ['name', 'type'],
        properties: {
            name: { type: 'string', example: 'Workspace atualizado' },
            type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'] }
        }
    }),
    'post /workspaces/{id}/invites': jsonBody({
        type: 'object',
        required: ['email'],
        properties: {
            email: { type: 'string', format: 'email', example: 'contador@empresa.com' },
            role: { type: 'string', enum: ['ACCOUNTANT', 'EDITOR', 'VIEWER'], default: 'ACCOUNTANT' }
        }
    }),
    'post /invites/accept': jsonBody({
        type: 'object',
        required: ['token'],
        properties: {
            token: { type: 'string', example: 'invite-token' }
        }
    }),
    'post /categories': jsonBody({
        type: 'object',
        required: ['name'],
        properties: {
            name: { type: 'string', example: 'Marketing' },
            icon: { type: 'string', example: 'megaphone' },
            color: { type: 'string', example: '#0EA5E9' }
        }
    }),
    'post /accounts': jsonBody({
        type: 'object',
        required: ['name', 'type'],
        properties: {
            name: { type: 'string', example: 'Banco principal' },
            type: { type: 'string', enum: ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT'] },
            initialBalance: { type: 'number', default: 0, example: 1500.5 },
            isIncludedInTotal: { type: 'boolean', default: true }
        }
    }),
    'put /accounts/{id}': jsonBody({
        type: 'object',
        properties: {
            name: { type: 'string', example: 'Conta atualizada' },
            type: { type: 'string', enum: ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT'] },
            isIncludedInTotal: { type: 'boolean' }
        }
    }),
    'patch /accounts/{id}': jsonBody({
        type: 'object',
        properties: {
            name: { type: 'string', example: 'Conta atualizada' },
            type: { type: 'string', enum: ['CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'INVESTMENT'] },
            isIncludedInTotal: { type: 'boolean' }
        }
    }),
    'post /transactions': jsonBody({
        type: 'object',
        required: ['description', 'amount', 'date', 'type', 'accountId', 'categoryId'],
        properties: {
            description: { type: 'string', example: 'Recebimento de cliente' },
            amount: { type: 'number', example: 2500.9 },
            date: { type: 'string', format: 'date-time' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            accountId: { type: 'integer', minimum: 1 },
            categoryId: { type: 'integer', minimum: 1 },
            isPaid: { type: 'boolean', default: true },
            grossAmount: { type: 'number', nullable: true },
            marketplaceFee: { type: 'number', nullable: true },
            shippingCost: { type: 'number', nullable: true },
            productCost: { type: 'number', nullable: true },
            platformFeeRate: { type: 'number', nullable: true },
            attachmentUrl: { type: 'string', nullable: true },
            attachmentSize: { type: 'integer', nullable: true }
        }
    }),
    'post /uploads/presigned': jsonBody({
        type: 'object',
        required: ['fileName', 'contentType', 'folderType', 'fileSize'],
        properties: {
            fileName: { type: 'string', example: 'comprovante.pdf' },
            contentType: { type: 'string', example: 'application/pdf' },
            folderType: { type: 'string', enum: ['AVATAR', 'RECEIPT', 'INVOICE', 'CERTIFICATE', 'ASSET'] },
            fileSize: { type: 'integer', maximum: 10485760, example: 350000 }
        }
    }),
    'put /uploads/{filename}': binaryBody('application/octet-stream'),
    'post /bridge/transfer': jsonBody({
        type: 'object',
        required: ['fromWorkspaceId', 'toWorkspaceId', 'fromAccountId', 'toAccountId', 'amount'],
        properties: {
            fromWorkspaceId: { type: 'integer', minimum: 1 },
            toWorkspaceId: { type: 'integer', minimum: 1 },
            fromAccountId: { type: 'integer', minimum: 1 },
            toAccountId: { type: 'integer', minimum: 1 },
            amount: { type: 'number', example: 1200.0 },
            description: { type: 'string', default: 'Transferencia entre Workspaces' },
            date: { type: 'string', format: 'date-time' }
        }
    }),
    'post /transactions/import': jsonBody({
        type: 'object',
        required: ['fileName', 'accountId'],
        properties: {
            fileName: { type: 'string', example: 'extrato.ofx' },
            accountId: { type: 'integer', minimum: 1 }
        }
    }),
    'post /bank-movements/{id}/merge': jsonBody({
        type: 'object',
        required: ['keepId', 'discardIds'],
        properties: {
            keepId: { type: 'string', format: 'uuid' },
            discardIds: {
                type: 'array',
                minItems: 1,
                items: { type: 'string', format: 'uuid' }
            }
        }
    }),
    'post /bank-movements/{id}/approve': jsonBody({
        type: 'object',
        required: ['categoryId'],
        properties: {
            categoryId: { type: 'integer', minimum: 1 }
        }
    })
};

const PARAMETERS = {
    'get /external/document/{cnpj}': [
        pathParam('cnpj', 'CNPJ com 14 digitos numericos.', { type: 'string', minLength: 14 })
    ],
    'get /external/location/{cep}': [
        pathParam('cep', 'CEP com 8 digitos numericos.', { type: 'string', minLength: 8 })
    ],
    'put /workspaces/{id}': [
        pathParam('id', 'ID numerico do workspace.', { type: 'integer', minimum: 1 })
    ],
    'post /workspaces/{id}/invites': [
        pathParam('id', 'ID numerico do workspace que emitira o convite.', { type: 'integer', minimum: 1 })
    ],
    'get /workspaces/{id}/invites': [
        pathParam('id', 'ID numerico do workspace.', { type: 'integer', minimum: 1 })
    ],
    'post /workspaces/{id}/invites/{inviteId}/revoke': [
        pathParam('id', 'ID numerico do workspace.', { type: 'integer', minimum: 1 }),
        pathParam('inviteId', 'UUID do convite a ser revogado.', uuidSchema)
    ],
    'post /invites/{id}/reject': [
        pathParam('id', 'UUID do convite a ser rejeitado.', uuidSchema)
    ],
    'get /workspaces/{id}/members': [
        pathParam('id', 'ID numerico do workspace.', { type: 'integer', minimum: 1 })
    ],
    'delete /workspaces/{id}/members/{userId}': [
        pathParam('id', 'ID numerico do workspace.', { type: 'integer', minimum: 1 }),
        pathParam('userId', 'ID numerico do usuario a ser removido.', { type: 'integer', minimum: 1 })
    ],
    'delete /categories/{id}': [
        pathParam('id', 'ID numerico da categoria.', { type: 'integer', minimum: 1 })
    ],
    'put /accounts/{id}': [
        pathParam('id', 'ID numerico da conta.', { type: 'integer', minimum: 1 })
    ],
    'patch /accounts/{id}': [
        pathParam('id', 'ID numerico da conta.', { type: 'integer', minimum: 1 })
    ],
    'delete /accounts/{id}': [
        pathParam('id', 'ID numerico da conta.', { type: 'integer', minimum: 1 })
    ],
    'get /transactions': [
        queryParam('startDate', 'Data inicial do filtro.', { type: 'string', format: 'date-time' }),
        queryParam('endDate', 'Data final do filtro.', { type: 'string', format: 'date-time' }),
        queryParam('accountId', 'Filtra por conta.', { type: 'integer', minimum: 1 }),
        queryParam('categoryId', 'Filtra por categoria.', { type: 'integer', minimum: 1 }),
        queryParam('type', 'Filtra por tipo de transacao.', { type: 'string', enum: ['INCOME', 'EXPENSE'] }),
        queryParam('cursor', 'Cursor da proxima pagina.', { type: 'string' }),
        queryParam('limit', 'Quantidade maxima de registros.', { type: 'integer', minimum: 1, maximum: 100, default: 20 })
    ],
    'delete /transactions/{id}': [
        pathParam('id', 'ID da transacao.', { type: 'string' })
    ],
    'get /transactions/{id}/attachment': [
        pathParam('id', 'ID da transacao com anexo.', { type: 'string' })
    ],
    'get /dashboard/summary': [
        queryParam('month', 'Mes de referencia.', { type: 'integer', minimum: 1, maximum: 12 }),
        queryParam('year', 'Ano de referencia.', { type: 'integer', minimum: 2000, maximum: 2100 })
    ],
    'put /uploads/{filename}': [
        pathParam('filename', 'Nome do arquivo reservado para upload local.', { type: 'string' })
    ],
    'get /accountant/bank-movements/pending': [
        queryParam('cursor', 'Cursor da proxima pagina.', uuidSchema),
        queryParam('limit', 'Quantidade maxima de registros.', { type: 'integer', minimum: 1, maximum: 100, default: 20 })
    ],
    'get /bank-movements': [
        queryParam('cursor', 'Cursor da proxima pagina.', uuidSchema),
        queryParam('limit', 'Quantidade maxima de registros.', { type: 'integer', minimum: 1, maximum: 100, default: 20 })
    ],
    'post /bank-movements/{id}/merge': [
        pathParam('id', 'UUID do movimento principal que sera mantido.', uuidSchema)
    ],
    'post /bank-movements/{id}/approve': [
        pathParam('id', 'UUID do movimento a ser aprovado.', uuidSchema)
    ],
    'post /bank-movements/{id}/reject': [
        pathParam('id', 'UUID do movimento a ser rejeitado.', uuidSchema)
    ]
};

const messageResponse = (description, message) => response(description, {
    type: 'object',
    properties: {
        message: { type: 'string', example: message }
    }
});

const RESPONSES = {
    'post /auth/register': {
        201: response('Conta criada com sucesso.', {
            allOf: [
                { $ref: '#/components/schemas/MessageResponse' },
                { type: 'object', properties: { userId: { type: 'integer', example: 1 } } }
            ]
        }),
        400: response('Falha de validacao do cadastro.', { $ref: '#/components/schemas/ValidationError' }),
        409: messageResponse('Ja existe usuario com o e-mail informado.', 'User already exists')
    },
    'post /auth/session': {
        200: response('Sessao autenticada com sucesso.', {
            type: 'object',
            properties: {
                user: { type: 'object' },
                token: { type: 'string' },
                refreshToken: { type: 'string', format: 'uuid' }
            }
        }),
        400: response('Corpo da requisicao invalido.', { $ref: '#/components/schemas/ValidationError' }),
        401: messageResponse('Credenciais invalidas.', 'Invalid credentials'),
        403: messageResponse('Conta ainda nao verificada.', 'E-mail nao verificado. Por favor, ative sua conta.')
    },
    'patch /auth/refresh': {
        200: response('Sessao renovada com sucesso.', { $ref: '#/components/schemas/TokenPair' }),
        400: response('Refresh token malformado.', { $ref: '#/components/schemas/ValidationError' }),
        401: messageResponse('Refresh token expirado ou invalido.', 'Sessao expirada ou invalida')
    },
    'post /auth/verify': {
        200: messageResponse('Conta verificada com sucesso.', 'Account verified successfully'),
        400: messageResponse('Codigo invalido, expirado ou payload incorreto.', 'Codigo invalido ou expirado.')
    },
    'post /auth/resend-verification': {
        200: messageResponse('Processamento do reenvio concluido.', 'If the email exists, a new code has been sent.'),
        400: messageResponse('Conta ja estava verificada ou payload invalido.', 'Esta conta ja esta verificada.')
    },
    'get /auth/me': {
        200: response('Perfil retornado com sucesso.', { type: 'object' }),
        401: messageResponse('Token ausente, invalido ou expirado.', 'Token invalido ou expirado'),
        404: messageResponse('Usuario nao encontrado.', 'Usuario nao encontrado')
    },
    'post /password/forgot': {
        204: { description: 'Solicitacao aceita. Nenhum conteudo e retornado para nao expor se o e-mail existe.' },
        400: response('Payload invalido.', { $ref: '#/components/schemas/ValidationError' })
    },
    'post /password/reset': {
        204: { description: 'Senha redefinida com sucesso.' },
        400: messageResponse('Codigo, e-mail ou nova senha invalidos.', 'Codigo invalido, expirado ou e-mail incorreto.')
    },
    'post /api/webhooks/open-finance': {
        202: response('Lote recebido e processado.', {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Open Finance webhook processed.' },
                details: { type: 'object' }
            }
        }),
        400: messageResponse('Payload invalido para o webhook.', 'Invalid Open Finance webhook payload.'),
        401: messageResponse('Token do webhook invalido.', 'Webhook authorization failed.')
    },
    'get /external/document/{cnpj}': {
        200: response('Dados do CNPJ retornados com sucesso.', { type: 'object' }),
        500: messageResponse('Falha ao consultar a fonte externa.', 'Erro Interno ao buscar CNPJ')
    },
    'get /external/location/{cep}': {
        200: response('Dados do CEP retornados com sucesso.', { type: 'object' }),
        500: messageResponse('Falha ao consultar a fonte externa.', 'Erro Interno ao buscar CEP')
    },
    'put /users/profile': {
        200: response('Perfil atualizado com sucesso.', { type: 'object' }),
        400: messageResponse('Falha de validacao ou regra de negocio.', 'Erro Interno ao atualizar perfil'),
        401: messageResponse('Usuario nao autenticado.', 'Token invalido ou expirado')
    },
    'get /workspaces': { 200: response('Lista de workspaces retornada com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'post /workspaces': {
        201: response('Workspace criado com sucesso.', { type: 'object' }),
        400: messageResponse('Falha na criacao do workspace.', 'Bad request')
    },
    'put /workspaces/{id}': {
        200: response('Workspace atualizado com sucesso.', { type: 'object' }),
        400: messageResponse('Payload incompleto ou invalido.', 'Name and Type are required for update'),
        403: messageResponse('Usuario sem acesso ao workspace.', 'Workspace not found or access denied')
    },
    'post /workspaces/{id}/invites': {
        201: response('Convite criado com sucesso.', {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Invite generated successfully' },
                token: { type: 'string' },
                expiresAt: { type: 'string', format: 'date-time' }
            }
        }),
        400: messageResponse('Payload invalido para convite.', 'Bad request'),
        403: messageResponse('Usuario sem permissao ou convite invalido.', 'Access denied')
    },
    'post /workspaces/{id}/invites/{inviteId}/revoke': {
        200: messageResponse('Convite revogado com sucesso.', 'Invite revoked successfully'),
        403: messageResponse('Convite nao pode ser revogado.', 'Access denied')
    },
    'post /invites/accept': {
        200: response('Convite aceito com sucesso.', {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Invite accepted successfully' },
                workspaceId: { type: 'integer', example: 3 },
                role: { type: 'string', example: 'ACCOUNTANT' }
            }
        }),
        400: messageResponse('Token de convite invalido.', 'Bad request'),
        403: messageResponse('Convite expirado, revogado ou com e-mail divergente.', 'Convite nao permitido.')
    },
    'get /invites/received': {
        200: response('Convites recebidos retornados com sucesso.', { type: 'array', items: { type: 'object' } }),
        404: messageResponse('Usuario autenticado nao encontrado.', 'User not found')
    },
    'post /invites/{id}/reject': {
        200: messageResponse('Convite rejeitado com sucesso.', 'Invite rejected successfully'),
        403: messageResponse('Convite nao pode ser rejeitado pelo usuario atual.', 'Convite nao permitido.'),
        404: messageResponse('Convite nao encontrado.', 'Invite not found')
    },
    'get /workspaces/{id}/members': { 200: response('Membros retornados com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'get /workspaces/{id}/invites': { 200: response('Convites emitidos retornados com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'delete /workspaces/{id}/members/{userId}': {
        200: response('Membro removido com sucesso.', { type: 'object' }),
        403: messageResponse('Usuario sem permissao para remover o membro.', 'Operacao nao permitida.'),
        404: messageResponse('Usuario alvo nao e membro do workspace.', 'Target user not a member of this workspace')
    },
    'get /categories': { 200: response('Categorias retornadas com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'post /categories': {
        201: response('Categoria criada com sucesso.', { type: 'object' }),
        400: messageResponse('Falha na criacao da categoria.', 'Bad request')
    },
    'delete /categories/{id}': {
        204: { description: 'Categoria removida com sucesso.' },
        403: messageResponse('Categoria protegida ou inexistente.', 'Nao e possivel deletar esta categoria.')
    },
    'get /accounts': { 200: response('Contas retornadas com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'post /accounts': {
        201: response('Conta criada com sucesso.', { type: 'object' }),
        400: messageResponse('Falha na criacao da conta.', 'Bad request')
    },
    'put /accounts/{id}': {
        200: response('Conta atualizada com sucesso.', { type: 'object' }),
        400: messageResponse('Nenhum campo valido foi enviado.', 'No data provided for update'),
        404: messageResponse('Conta nao encontrada.', 'Account not found')
    },
    'patch /accounts/{id}': {
        200: response('Conta atualizada com sucesso.', { type: 'object' }),
        400: messageResponse('Nenhum campo valido foi enviado.', 'No data provided for update'),
        404: messageResponse('Conta nao encontrada.', 'Account not found')
    },
    'delete /accounts/{id}': {
        204: { description: 'Conta removida com sucesso.' },
        404: messageResponse('Conta nao encontrada.', 'Account not found')
    },
    'get /transactions/all': { 200: response('Transacoes globais retornadas com sucesso.', { type: 'array', items: { type: 'object' } }) },
    'get /transactions': {
        200: response('Extrato retornado com sucesso.', { $ref: '#/components/schemas/CursorPage' })
    },
    'post /transactions': {
        201: response('Transacao criada com sucesso.', { type: 'object' }),
        400: messageResponse('Falha de validacao ou referencia invalida.', 'Invalid transaction payload')
    },
    'delete /transactions/{id}': {
        204: { description: 'Transacao removida com sucesso.' },
        400: messageResponse('Transacao nao encontrada ou acesso negado.', 'Transaction not found or access denied')
    },
    'get /transactions/{id}/attachment': {
        200: response('URL assinada retornada com sucesso.', {
            type: 'object',
            properties: {
                url: { type: 'string', format: 'uri' },
                expiresInSeconds: { type: 'integer', example: 300 }
            }
        }),
        404: messageResponse('Anexo nao encontrado ou sem permissao.', 'Falha ao processar assinatura de visualizacao.')
    },
    'get /dashboard/summary': {
        200: response('Resumo gerencial retornado com sucesso.', { type: 'object' }),
        500: messageResponse('Falha ao consolidar o dashboard.', 'Error generating dashboard summary')
    },
    'post /uploads/presigned': {
        200: response('Instrucao de upload gerada com sucesso.', { type: 'object' }),
        400: messageResponse('Metadados do arquivo invalidos.', 'Bad request'),
        402: messageResponse('Limite ou politica comercial impediu o upload.', 'Upload blocked by billing policy')
    },
    'put /uploads/{filename}': {
        200: { description: 'Arquivo recebido com sucesso no modo local.' },
        500: messageResponse('Falha no recebimento do arquivo.', 'Erro ao salvar o arquivo')
    },
    'post /bridge/transfer': {
        201: response('Transferencia criada com sucesso.', {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Transferencia realizada com sucesso' },
                details: { type: 'object' }
            }
        }),
        400: messageResponse('Transferencia invalida ou saldo insuficiente.', 'A transferencia deve ser entre workspaces diferentes.'),
        403: messageResponse('Usuario sem permissao para um dos workspaces.', 'Permissao negada'),
        500: messageResponse('Falha interna ao processar a transferencia.', 'Erro interno ao processar transferencia.')
    },
    'post /transactions/import': {
        200: response('Arquivo OFX importado com sucesso.', {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Importacao concluida' },
                details: { type: 'object' }
            }
        }),
        400: messageResponse('Arquivo ou conta invalidos para importacao.', 'Bad request'),
        404: messageResponse('Arquivo informado nao foi encontrado.', 'Arquivo nao encontrado. Faca o upload primeiro.')
    },
    'post /accountant/cache/refresh': {
        200: response('Cache atualizado e retornado com sucesso.', {
            type: 'object',
            properties: {
                dashboardCache: { type: 'array', items: { type: 'object' } },
                result: { type: 'object' }
            }
        }),
        403: messageResponse('Usuario autenticado nao e contador.', 'Apenas contadores podem atualizar este cache'),
        404: messageResponse('Usuario autenticado nao foi encontrado.', 'Usuario nao encontrado')
    },
    'get /accountant/bank-movements/pending': { 200: response('Pendencias globais retornadas com sucesso.', { $ref: '#/components/schemas/CursorPage' }) },
    'get /bank-movements': { 200: response('Pendencias do workspace retornadas com sucesso.', { $ref: '#/components/schemas/CursorPage' }) },
    'post /bank-movements/{id}/merge': {
        200: response('Movimentos mesclados com sucesso.', { type: 'object' }),
        400: messageResponse('O parametro da rota nao bate com o keepId ou payload invalido.', 'O param :id deve corresponder ao keepId do body')
    },
    'post /bank-movements/{id}/approve': {
        200: response('Movimento ja estava aprovado e foi retornado de forma idempotente.', { type: 'object' }),
        201: response('Movimento aprovado e convertido em transacao.', { type: 'object' })
    },
    'post /bank-movements/{id}/reject': {
        200: response('Movimento rejeitado com sucesso.', { type: 'object' })
    }
};

const MISSING_OPERATIONS = {
    '/api/webhooks/open-finance': { post: {} },
    '/accountant/cache/refresh': { post: {} },
    '/accountant/bank-movements/pending': { get: {} },
    '/bank-movements': { get: {} },
    '/bank-movements/{id}/merge': { post: {} },
    '/bank-movements/{id}/approve': { post: {} },
    '/bank-movements/{id}/reject': { post: {} }
};

const routeKey = (method, route) => `${method.toLowerCase()} ${route}`;

const mergeParameters = (existing = [], additions = []) => {
    const merged = [...existing];
    for (const addition of additions) {
        const alreadyExists = merged.some((parameter) => parameter.name === addition.name && parameter.in === addition.in);
        if (!alreadyExists) {
            merged.push(addition);
        }
    }
    return merged;
};

const cleanupResponses = (responses = {}) => Object.fromEntries(
    Object.entries(responses).filter(([code]) => !/^\d$/.test(code))
);

const routeSecurity = (route) => {
    if (route === '/api/webhooks/open-finance') {
        return webhookSecurity;
    }
    if (PUBLIC_ROUTES.has(route)) {
        return publicSecurity;
    }
    if (WORKSPACE_ROUTES.has(route)) {
        return bearerWorkspaceSecurity;
    }
    return bearerSecurity;
};

const removeSecurityHeadersFromParameters = (parameters = [], route) => {
    return parameters.filter((parameter) => {
        if (route !== '/api/webhooks/open-finance' && parameter.in === 'header' && parameter.name.toLowerCase() === 'authorization') {
            return false;
        }
        if (parameter.in === 'header' && parameter.name.toLowerCase() === 'x-workspace-id') {
            return false;
        }
        return true;
    });
};

const applyOperationMetadata = (route, method, operation) => {
    const key = routeKey(method, route);
    const metadata = OPERATION_METADATA[key];
    const requestBody = REQUEST_BODIES[key];
    const parameters = PARAMETERS[key];
    const responses = RESPONSES[key];

    if (metadata) {
        operation.tags = metadata.tags;
        operation.summary = metadata.summary;
        operation.description = metadata.description;
    }

    operation.security = routeSecurity(route);
    operation.parameters = removeSecurityHeadersFromParameters(
        mergeParameters(operation.parameters, parameters),
        route
    );

    if (requestBody) {
        operation.requestBody = requestBody;
    }

    operation.responses = responses || cleanupResponses(operation.responses);
};

const postProcessSwagger = (swaggerDoc) => {
    swaggerDoc.paths = swaggerDoc.paths || {};
    swaggerDoc.info = doc.info;
    swaggerDoc.servers = doc.servers;
    swaggerDoc.tags = doc.tags;
    swaggerDoc.components = swaggerDoc.components || {};
    swaggerDoc.components.securitySchemes = SECURITY_SCHEMES;
    swaggerDoc.components.schemas = COMPONENT_SCHEMAS;

    for (const [route, operations] of Object.entries(MISSING_OPERATIONS)) {
        swaggerDoc.paths[route] = {
            ...(swaggerDoc.paths[route] || {}),
            ...operations,
        };
    }

    delete swaggerDoc.security;

    for (const [route, pathItem] of Object.entries(swaggerDoc.paths)) {
        for (const method of Object.keys(pathItem)) {
            if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
                continue;
            }
            applyOperationMetadata(route, method, pathItem[method]);
        }
    }

    return swaggerDoc;
};

const generateSwagger = async () => {
    await swaggerAutogen(outputFile, routes, doc);

    const absoluteOutputFile = path.resolve(__dirname, 'src', 'swagger-output.json');
    const swaggerDoc = JSON.parse(fs.readFileSync(absoluteOutputFile, 'utf8'));
    const processedDoc = postProcessSwagger(swaggerDoc);

    fs.writeFileSync(absoluteOutputFile, JSON.stringify(processedDoc, null, 2));
    console.log('Swagger gerado e enriquecido com sucesso.');
};

module.exports = {
    generateSwagger
};
