import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { PasswordResetController } from './controllers/PasswordResetController';
import { VerificationController } from './controllers/VerificationController';
import { CategoryController } from './controllers/CategoryController';
import { AccountController } from './controllers/AccountController';
import { TransactionController } from './controllers/TransactionController';
import { DashboardController } from './controllers/DashboardController';
import { WorkspaceController } from './controllers/WorkspaceController';
import { UploadController } from './controllers/UploadController';
import { BridgeController } from './controllers/BridgeController';
import { ImportController } from './controllers/ImportController';
import { ExternalDataController } from './controllers/ExternalDataController';
import { UserController } from './controllers/UserController';
import { InviteController } from './controllers/InviteController';
import { BankMovementController } from './controllers/BankMovementController';
import { OpenFinanceWebhookController } from './controllers/OpenFinanceWebhookController';
import { AccountantCacheService } from './services/AccountantCacheService';
import { AdminController } from './controllers/AdminController';
import { ExportController } from './controllers/ExportController';
import { sysPrisma } from './lib/prisma';

// Middlewares
import { AuthMiddleware } from './middlewares/AuthMiddleware';
import { WorkspaceMiddleware } from './middlewares/WorkspaceMiddleware';
import { RbacMiddleware } from './middlewares/RbacMiddleware';
import { AdminMiddleware } from './middlewares/AdminMiddleware';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

// V3.8 Configuração de multer para Certificados
const certUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB para pfx
    fileFilter: (_req, file, cb) => {
        const name = file.originalname.toLowerCase();
        if (name.endsWith('.p12') || name.endsWith('.pfx')) {
            cb(null, true);
        } else {
            cb(new Error('Extensão inválida. Apenas arquivos .p12 e .pfx são aceitos.'));
        }
    }
});

const router = Router();

// V3.8 Cota DDoS: Limitar spam de geração AWS S3
const uploadRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // Limite de 10 requisições por IP
    message: { message: 'Rate Limit: Muitas requisições de upload simultâneas. Tente novamente em 1 minuto.' },
});

// Controllers
const authController = new AuthController();
const passwordResetController = new PasswordResetController();
const verificationController = new VerificationController();
const categoryController = new CategoryController();
const accountController = new AccountController();
const transactionController = new TransactionController();
const dashboardController = new DashboardController();
const workspaceController = new WorkspaceController();
const uploadController = new UploadController();
const bridgeController = new BridgeController();
const importController = new ImportController();
const externalDataController = new ExternalDataController();
const userController = new UserController();
const inviteController = new InviteController();
const bankMovementController = new BankMovementController();
const openFinanceWebhookController = new OpenFinanceWebhookController();
const accountantCacheService = new AccountantCacheService();
const adminController = new AdminController();

// ==============================================================================
// AUTENTICAÇÃO & IDENTIDADE
// ==============================================================================

// --- AUTH ---
router.post('/auth/register', (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Registrar Novo Usuário'
       #swagger.description = 'Cria uma conta no sistema e dispara o e-mail transacional com código PIN de validação.' */
    return authController.register(req, res);
});

router.post('/auth/session', (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Iniciar Sessão (Login)'
       #swagger.description = 'Autentica um usuário via e-mail e senha, retornando o Access Token (JWT curto) e o Refresh Token.' */
    return authController.authenticate(req, res);
});

router.patch('/auth/refresh', (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Renovar Token de Acesso'
       #swagger.description = 'Utiliza um Refresh Token válido para expedir uma nova sessão limpa sem solicitar login novamente.' */
    return authController.refresh(req, res);
});

router.post('/auth/verify', (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Verificar E-mail (Código Opt-in)'
       #swagger.description = 'Confirmar o código PIN recebido no e-mail para ativar a conta Pessoal no sistema.' */
    return verificationController.verify(req, res);
});

router.post('/auth/resend-verification', (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Reenviar PIN de Ativação'
       #swagger.description = 'Gera e envia um novo código numérico de validação para o usuário logar.' */
    return verificationController.resend(req, res);
});

router.get('/auth/me', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Autenticação']
       #swagger.summary = 'Obter Perfil do Usuário Autenticado'
       #swagger.description = 'Retorna o perfil completo do utilizador com as memberships (workspaces) atualizadas. Resolve o problema de sincronização após aceitar convites ou refresh da página (F5).'
       #swagger.responses[200] = {
           description: 'Perfil retornado com sucesso',
           content: { 'application/json': { schema: { type: 'object', properties: {
               id: { type: 'integer' },
               name: { type: 'string' },
               email: { type: 'string' },
               type: { type: 'string', enum: ['CLIENT', 'ACCOUNTANT'] },
               systemRole: { type: 'string', enum: ['USER', 'ADMIN'] },
               memberships: { type: 'array', items: { type: 'object', properties: {
                   id: { type: 'integer' }, name: { type: 'string' },
                   type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'] },
                   role: { type: 'string', enum: ['OWNER', 'EDITOR', 'VIEWER', 'ACCOUNTANT'] }
               }}}
           }}}}
       }
       #swagger.responses[401] = { description: 'Token inválido ou expirado' }
       #swagger.responses[404] = { description: 'Usuário não encontrado' } */
    return authController.me(req, res);
});

router.post('/password/forgot', (req, res, next) => {
    /* #swagger.tags = ['Recuperação']
       #swagger.summary = 'Esqueci a Senha'
       #swagger.description = 'Dispara um e-mail transacional contendo o token de seis dígitos (OTP) para alterar credenciais.' */
    return passwordResetController.forgotPassword(req, res);
});

router.post('/password/reset', (req, res, next) => {
    /* #swagger.tags = ['Recuperação']
       #swagger.summary = 'Aplicar Nova Senha'
       #swagger.description = 'Recebe o token enviado via e-mail e a nova senha para registrar a alteração e desbloquear o perfil.' */
    return passwordResetController.resetPassword(req, res);
});

// ==============================================================================
// INTEGRAÇÕES EXTERNAS (Dados e LGPD)
// ==============================================================================
router.post('/api/webhooks/open-finance', (req, res, next) => {
    /* #swagger.tags = ['Webhooks']
       #swagger.summary = 'Ingestao Open Finance'
       #swagger.description = 'Recebe lotes JSON de movimentos Open Finance e delega a persistencia para a FinancialIngestionEngine.' */
    return openFinanceWebhookController.ingest(req, res);
});

router.get('/external/document/:cnpj', (req, res, next) => {
    /* #swagger.tags = ['Integrações']
       #swagger.summary = 'Consultar CNPJ (Receita Federal)'
       #swagger.description = 'Limpa, formata e consulta automaticamente um CNPJ retornando Razão Social, Nome Fantasia e CNAE Ativo.' */
    return externalDataController.getCnpj(req, res);
});

router.get('/external/location/:cep', (req, res, next) => {
    /* #swagger.tags = ['Integrações']
       #swagger.summary = 'Consultar CEP (ViaCEP)'
       #swagger.description = 'Busca endereço completo (Rua, Bairro, Cidade e UF) a partir de um código postal brasileiro.' */
    return externalDataController.getCep(req, res);
});

// ==============================================================================
// GESTÃO DE WORKSPACES E USUÁRIO
// ==============================================================================

router.put('/users/profile', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Perfil do Usuário']
       #swagger.summary = 'Editar Dados do Perfil'
       #swagger.description = 'Atualiza o nome global do usuário vinculado ao seu token logado.' */
    return userController.updateProfile(req, res);
});

router.get('/workspaces', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Workspaces']
       #swagger.summary = 'Listar os Meus Espaços'
       #swagger.description = 'Lista as instâncias de atuação a que este usuário tem acesso (Ex: Seu Pessoal e Sua Empresa CNPJ).' */
    return workspaceController.list(req, res);
});

router.post('/workspaces', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Workspaces']
       #swagger.summary = 'Gerar Novo Workspace'
       #swagger.description = 'Insere um novo Workspace (Empresarial ou Pessoal Extra) na grade organizacional da conta.' */
    return workspaceController.create(req, res);
});

router.put('/workspaces/:id', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Workspaces']
       #swagger.summary = 'Modificar Workspace'
       #swagger.description = 'Edita metadados da instância fiscal.' */
    return workspaceController.update(req, res);
});

router.post('/workspaces/:id/certificate-a1', AuthMiddleware, WorkspaceMiddleware, RbacMiddleware('OWNER'), (req, res, next) => {
    /* #swagger.tags = ['Workspaces']
       #swagger.summary = 'Upload de Certificado A1'
       #swagger.description = 'Autoriza apenas o OWNER a fazer upload de certificado digital em memória (máx 10MB) sem persistência de disco local.'
       #swagger.consumes = ['multipart/form-data']
       #swagger.parameters['certificate'] = {
           in: 'formData',
           type: 'file',
           required: true,
           description: 'Arquivo do certificado (.p12 ou .pfx)'
       } */
    certUpload.single('certificate')(req, res, (err: any) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, (req, res, next) => {
    return workspaceController.uploadCertificate(req, res);
});

// --- WORKSPACE INVITES (Gerenciamento de Membros) ---
router.post('/workspaces/:id/invites', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Gerar Convite (Smart Link)'
       #swagger.description = 'Cria um convite com Token Criptografado para que um contador ou editor acesse esta empresa. Apenas o OWNER pode executar.' */
    return inviteController.create(req, res);
});

router.post('/workspaces/:id/invites/:inviteId/revoke', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Revogar Convite'
       #swagger.description = 'Invalida um link de convite previamente gerado, bloqueando o engajamento caso o link tenha vazado.' */
    return inviteController.revoke(req, res);
});

router.post('/invites/accept', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Aceitar Convite (Double Handshake)'
       #swagger.description = 'Consome o token do convite. Valida se o email do destinatário bate fisicamente com o email da sessão logada antes de injetar a Role na tabela.'
       #swagger.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string', description: 'Token criptográfico do convite' } }, required: ['token'] } } } }
       #swagger.responses[200] = { description: 'Convite aceito. WorkspaceMember criado.' }
       #swagger.responses[403] = { description: 'Email mismatch, convite revogado ou expirado' } */
    return inviteController.accept(req, res);
});

router.get('/invites/received', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Listar Convites Recebidos'
       #swagger.description = 'Retorna todos os convites (qualquer status) onde o email do utilizador logado é o destinatário. Usado na Central de Convites do Contador.'
       #swagger.responses[200] = {
           description: 'Lista de convites recebidos',
           content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: {
               id: { type: 'string', format: 'uuid' },
               email: { type: 'string' },
               role: { type: 'string' },
               status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'REJECTED'] },
               expiresAt: { type: 'string', format: 'date-time' },
               workspace: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, type: { type: 'string' } } },
               inviter: { type: 'object', properties: { name: { type: 'string' } } }
           }}}}}
       } */
    return inviteController.listReceived(req, res);
});

router.post('/invites/:id/reject', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Rejeitar Convite'
       #swagger.description = 'O destinatário recusa o convite. Altera status para REJECTED. Requer que o email do utilizador logado corresponda ao email do convite (Double Handshake).'
       #swagger.parameters['id'] = { in: 'path', description: 'UUID do convite', required: true, type: 'string' }
       #swagger.responses[200] = { description: 'Convite rejeitado com sucesso' }
       #swagger.responses[403] = { description: 'Email mismatch ou convite não está PENDING' }
       #swagger.responses[404] = { description: 'Convite não encontrado' } */
    return inviteController.reject(req, res);
});

router.get('/workspaces/:id/members', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Membros']
       #swagger.summary = 'Listar Membros do Workspace'
       #swagger.description = 'Retorna todos os membros atuais do workspace com nome, email, tipo e role. Requer membership.'
       #swagger.parameters['id'] = { in: 'path', description: 'ID do workspace', required: true, type: 'integer' }
       #swagger.responses[200] = {
           description: 'Lista de membros',
           content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: {
               userId: { type: 'integer' }, workspaceId: { type: 'integer' },
               role: { type: 'string', enum: ['OWNER', 'EDITOR', 'VIEWER', 'ACCOUNTANT'] },
               user: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' }, type: { type: 'string' } } }
           }}}}}
       } */
    return inviteController.listMembers(req, res);
});

router.get('/workspaces/:id/invites', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Convites']
       #swagger.summary = 'Listar Convites Enviados por Workspace'
       #swagger.description = 'Retorna o histórico de convites emitidos por este workspace. Requer membership no workspace.'
       #swagger.parameters['id'] = { in: 'path', description: 'ID do workspace', required: true, type: 'integer' }
       #swagger.responses[200] = {
           description: 'Lista de convites enviados',
           content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: {
               id: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' },
               status: { type: 'string' }, expiresAt: { type: 'string' },
               inviter: { type: 'object', properties: { name: { type: 'string' } } }
           }}}}}
       } */
    return inviteController.listSent(req, res);
});

router.delete('/workspaces/:id/members/:userId', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Membros']
       #swagger.summary = 'Revogar Acesso de Membro'
       #swagger.description = 'O OWNER remove um membro do workspace. Não permite auto-remoção. Caso de uso: desligar um contador ou editor.'
       #swagger.parameters['id'] = { in: 'path', description: 'ID do workspace', required: true, type: 'integer' }
       #swagger.parameters['userId'] = { in: 'path', description: 'ID do utilizador a ser removido', required: true, type: 'integer' }
       #swagger.responses[200] = { description: 'Membro removido com sucesso' }
       #swagger.responses[403] = { description: 'Apenas OWNER pode remover membros / Não pode remover a si mesmo' }
       #swagger.responses[404] = { description: 'Utilizador alvo não é membro deste workspace' } */
    return inviteController.removeMember(req, res);
});

// ==============================================================================
// FINANCEIRO (ROTAS PROTEGIDAS POR WORKSPACE)
// ==============================================================================

// --- CATEGORIES ---
router.get('/categories', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Categorias']
       #swagger.summary = 'Catálogo de Classificações'
       #swagger.description = 'Retorna ou pesquisa categorias (Entradas e Saídas) restritas ao escopo do Workspace atual.' */
    return categoryController.list(req, res);
});

router.post('/categories', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Categorias']
       #swagger.summary = 'Cadastrar Categoria Customizada'
       #swagger.description = 'Insere uma nova pasta no sistema (Cor, Nome, Tipo e Ícone) agrupada no Workspace do Header.' */
    return categoryController.create(req, res);
});

router.delete('/categories/:id', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Categorias']
       #swagger.summary = 'Deletar Categoria'
       #swagger.description = 'Exclui soft e impede o uso dessa categoria do catálogo deste Workspace específico.' */
    return categoryController.delete(req, res);
});

// --- ACCOUNTS ---
router.get('/accounts', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Contas']
       #swagger.summary = 'Minhas Carteiras'
       #swagger.description = 'Lista as origens de dinheiro cadastradas no Sandbox deste ambiente/CNPJ.' */
    return accountController.list(req, res);
});

router.post('/accounts', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Contas']
       #swagger.summary = 'Lançar Conta/Saldo'
       #swagger.description = 'Habilita uma nova carteira bancária na visão do cofre, com seu saldo primário de abertura.' */
    return accountController.create(req, res);
});

router.put('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Contas']
       #swagger.summary = 'Ajustar Detalhes da Conta'
       #swagger.description = 'Sobrepõe fisicamente dados técnicos ou cadastrais do banco.' */
    return accountController.update(req, res);
});

router.patch('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Contas']
       #swagger.summary = 'Reconciliar Saldo'
       #swagger.description = 'Atualiza cirurgicamente e assincronamente o saldo monetário exibido.' */
    return accountController.update(req, res);
});

router.delete('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Contas']
       #swagger.summary = 'Ocultar Conta Bancária'
       #swagger.description = 'Inativa a conta e bloqueia inserções da mesma em transações novas.' */
    return accountController.delete(req, res);
});

// --- TRANSACTIONS ---
router.get('/transactions/all', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Transações']
       #swagger.summary = 'Acesso Irrestrito Global'
       #swagger.description = 'Lista todas as movimentações sem distinção de CNPJ ou instâncias empresariais (Acesso C-Level).' */
    return transactionController.listAll(req, res);
});

router.get('/transactions', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Transações']
       #swagger.summary = 'Consultar Lançamentos'
       #swagger.description = 'Aplica os filtros de Extrato (Datas, Categorias e Tags) para resgatar movimentações do Workspace corrente.' */
    return transactionController.list(req, res);
});

router.post('/transactions', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Transações']
       #swagger.summary = 'Criar Movimentação Financeira'
       #swagger.description = 'Faz a inserção formal de Receitas/Despesas operacionais impactando de forma viva a contabilidade central.' */
    return transactionController.create(req, res);
});

router.delete('/transactions/:id', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Transações']
       #swagger.summary = 'Deletar Lançamento e Limpar Cota R2'
       #swagger.description = 'Realiza o Rollback do Saldo Bancário, extingue o registro fiscal e dispara a Faxina do Cloudflare para recuperar a cota.' */
    return transactionController.delete(req, res);
});

router.get('/transactions/:id/attachment', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Transações']
       #swagger.summary = 'Visualizar Anexo (Assinatura de 5 min)'
       #swagger.description = 'Retorna a URL pré-assinada (S3 V4) efêmera para visualização temporária do comprovante, com as chaves SSE-C necessárias caso seja vault.' */
    return uploadController.getAttachmentUrl(req, res);
});

// --- DASHBOARD ---
router.get('/dashboard/summary', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Dashboard']
       #swagger.summary = 'Calculadora de Analytics e KPIs'
       #swagger.description = 'Agrupa sub-queries gerando Receitas Totais, Despesas do Mês, Lista dos Últimos Movimentos e Progressões.' */
    return dashboardController.getSummary(req, res);
});

// --- UPLOADS ---
router.post('/uploads/presigned', AuthMiddleware, WorkspaceMiddleware, uploadRateLimiter, (req, res, next) => {
    /* #swagger.tags = ['Uploads']
       #swagger.summary = 'Gerar Endpoint Cloud/S3 Segregado'
       #swagger.description = 'Autoriza temporariamente um token para subir o arquivo para o Cloud mantendo a validade e auditoria de origem.' */
    return uploadController.requestUploadUrl(req, res);
});

router.put('/uploads/:filename', (req, res, next) => {
    /* #swagger.tags = ['Uploads']
       #swagger.summary = 'Ancoragem de Bytes Físicos'
       #swagger.description = 'Recepção estruturada pela porta 3333 dos binários submetidos em background.' */
    return uploadController.localUploadHandler(req, res);
});

// --- BRIDGE ---
router.post('/bridge/transfer', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Bridge (Pró-labore)']
       #swagger.summary = 'Atravessamento Automático Pró-labore'
       #swagger.description = 'Puxa o dinheiro da conta bancária de seu Workspace PJ e remete limpando na declaração de contas da sua aba Pessoal com sincronismo de transações cruzadas!' */
    return bridgeController.transfer(req, res);
});

// --- IMPORTAÇÃO ---
router.post('/transactions/import', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Importação']
       #swagger.summary = 'Decodificar OFX Bancário'
       #swagger.description = 'Lê e traduz blocos de dados transacionais gerados por sistemas bancários antigos e transforma instantaneamente em Json compatível PACT.' */
    return importController.importOFX(req, res);
});

// ==============================================================================
// INBOX DE APROVAÇÃO (Bank Movements - Staging → Transaction)
// ==============================================================================

router.get('/accountant/bank-movements/pending', AuthMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Inbox Aprovação']
       #swagger.summary = 'Listar Movimentos Pendentes (Global Contador)'
       #swagger.description = 'Retorna BankMovements com status PENDING de TODOS os workspaces onde o usuário é ACCOUNTANT. Não usa WorkspaceMiddleware.' */
    return bankMovementController.listGlobalPending(req, res);
});

router.post('/accountant/cache/refresh', AuthMiddleware, async (req, res, next) => {
    /* #swagger.tags = ['Accountant']
       #swagger.summary = 'Forçar atualização do cache do contador'
       #swagger.description = 'Atualiza sob demanda o AccountantDashboardCache do usuário ACCOUNTANT autenticado e retorna o dashboardCache atualizado.' */
    const user = await sysPrisma.user.findUnique({
        where: { id: req.user.id },
        select: { type: true },
    });

    if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (user.type !== 'ACCOUNTANT') {
        return res.status(403).json({ message: 'Apenas contadores podem atualizar este cache' });
    }

    const result = await accountantCacheService.refreshCache(req.user.id);
    const dashboardCache = await accountantCacheService.getCachedDashboard(req.user.id);

    return res.status(200).json({ dashboardCache, result });
});

router.get('/bank-movements', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Inbox Aprovação']
       #swagger.summary = 'Listar Movimentos Pendentes'
       #swagger.description = 'Retorna BankMovements com status PENDING do workspace corrente, paginados por cursor. Filtro Zero Trust: WorkspaceMiddleware já bloqueia PERSONAL para contadores.' */
    return bankMovementController.listPending(req, res);
});

router.post('/bank-movements/:id/merge', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Inbox Aprovação']
       #swagger.summary = 'Mesclar Movimentos Duplicados'
       #swagger.description = 'Combina rawPayload de 2+ movimentos no keepId e deleta os discardIds. Operação atômica via prisma.$transaction.' */
    return bankMovementController.merge(req, res);
});

router.post('/bank-movements/:id/approve', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Inbox Aprovação']
       #swagger.summary = 'Aprovar Movimento → Transaction'
       #swagger.description = 'Converte um BankMovement PENDING em Transaction real, atualizando saldo da conta e marcando o movimento como APPROVED.' */
    return bankMovementController.approve(req, res);
});

router.post('/bank-movements/:id/reject', AuthMiddleware, WorkspaceMiddleware, (req, res, next) => {
    /* #swagger.tags = ['Inbox Aprovação']
       #swagger.summary = 'Rejeitar Movimento'
       #swagger.description = 'Marca o movimento como REJECTED sem criar Transaction.' */
    return bankMovementController.reject(req, res);
});

// ═══════════════════════════════════════════════════════════════════
// EXPORTAÇÃO CONTÁBIL
// ═══════════════════════════════════════════════════════════════════

const exportController = new ExportController();

router.post('/export/validate', AuthMiddleware, WorkspaceMiddleware, RbacMiddleware('ACCOUNTANT'), (req, res) => {
    /* #swagger.tags = ['Exportação Contábil']
       #swagger.summary = 'Pré-validação de exportação contábil'
       #swagger.description = 'Valida prontidão da exportação sem gerar arquivo. Retorna blockers e warnings.' */
    return exportController.validate(req, res);
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN / BACKOFFICE (bypass RLS — métricas globais apenas)
// ═══════════════════════════════════════════════════════════════════

router.get('/admin/metrics', AuthMiddleware, AdminMiddleware, (req, res) => {
    /* #swagger.tags = ['Admin']
       #swagger.summary = 'KPIs agregados da plataforma'
       #swagger.description = 'Retorna contadores globais (COUNT) sem dados individuais. Requer systemRole ADMIN.' */
    return adminController.getMetrics(req, res);
});

export { router };
