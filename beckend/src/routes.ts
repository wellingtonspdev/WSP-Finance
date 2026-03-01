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

// Middlewares
import { AuthMiddleware } from './middlewares/AuthMiddleware';
import { WorkspaceMiddleware } from './middlewares/WorkspaceMiddleware';
import rateLimit from 'express-rate-limit';

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

export { router };