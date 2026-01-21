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

// Middlewares
import { AuthMiddleware } from './middlewares/AuthMiddleware';
import { WorkspaceMiddleware } from './middlewares/WorkspaceMiddleware';

const router = Router();

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

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   parameters:
 *     WorkspaceHeader:
 *       in: header
 *       name: x-workspace-id
 *       schema:
 *         type: integer
 *         example: 1
 *       required: true
 *       description: ID do Workspace ativo (Sequencial)
 */

/**
 * @swagger
 * tags:
 *   - name: Autenticação
 *     description: Gestão de Login e Sessão
 *   - name: Verificação
 *     description: Fluxo de ativação de conta (Double Opt-in)
 *   - name: Recuperação
 *     description: Fluxo de "Esqueci minha senha"
 *   - name: Workspaces
 *     description: Gestão de Ambientes (Pessoal/Empresarial)
 *   - name: Categorias
 *     description: Gestão de Categorias (Híbrido)
 *   - name: Contas
 *     description: Gestão de Contas Bancárias/Caixa
 *   - name: Transações
 *     description: Gestão de Receitas e Despesas
 *   - name: Dashboard
 *     description: Analytics e Resumo Financeiro
 *   - name: Uploads
 *     description: Gestão de Comprovantes (S3/Local)
 */

// ==============================================================================
// AUTENTICAÇÃO & IDENTIDADE
// ==============================================================================

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Cria um novo usuário e envia e-mail de verificação
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "senha123"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso. Verifique seu e-mail.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: 'integer' }
 *                 name: { type: 'string' }
 *                 email: { type: 'string' }
 *                 message: { type: 'string', example: 'Conta criada. Por favor verifique seu e-mail para ativar.' }
 *       400:
 *         description: Erro de validação (Zod)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflito - E-mail já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               message: "Usuário já existe"
 */
router.post('/auth/register', authController.register.bind(authController));

/**
 * @swagger
 * /auth/session:
 *   post:
 *     summary: Autentica um usuário e retorna tokens
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "joao@email.com"
 *               password:
 *                 type: string
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               message: "Credenciais inválidas"
 *       403:
 *         description: E-mail não verificado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *             example:
 *               message: "E-mail não verificado. Por favor, ative sua conta."
 */
router.post('/auth/session', authController.authenticate.bind(authController));

/**
 * @swagger
 * /auth/refresh:
 *   patch:
 *     summary: Renova o Access Token usando um Refresh Token válido
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Tokens renovados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Refresh Token expirado ou inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.patch('/auth/refresh', authController.refresh.bind(authController));

// --- ACCOUNT VERIFICATION ---

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Ativa a conta usando o código enviado por e-mail
 *     tags: [Verificação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               code:
 *                 type: string
 *                 description: Código de 6 dígitos
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Conta ativada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: 'string', example: 'Conta verificada com sucesso' }
 *       400:
 *         description: Código inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/auth/verify', verificationController.verify.bind(verificationController));

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Reenvia o código de ativação caso o usuário tenha perdido
 *     tags: [Verificação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *     responses:
 *       200:
 *         description: Novo código enviado (se o e-mail existir)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: 'string', example: 'Se o e-mail existir, um novo código foi enviado.' }
 *       400:
 *         description: Conta já verificada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/auth/resend-verification', verificationController.resend.bind(verificationController));

// --- PASSWORD RECOVERY ---

/**
 * @swagger
 * /password/forgot:
 *   post:
 *     summary: Solicita um código de recuperação de senha por e-mail
 *     tags: [Recuperação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *     responses:
 *       204:
 *         description: Solicitação processada (sempre retorna sucesso por segurança)
 *       400:
 *         description: Erro de validação no e-mail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/password/forgot', passwordResetController.forgotPassword.bind(passwordResetController));

/**
 * @swagger
 * /password/reset:
 *   post:
 *     summary: Redefine a senha usando o código recebido
 *     tags: [Recuperação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               code:
 *                 type: string
 *                 description: Código de 6 dígitos
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "novaSenha123"
 *     responses:
 *       204:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Código inválido, expirado ou erro de validação
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiError'
 *                 - $ref: '#/components/schemas/ValidationError'
 */
router.post('/password/reset', passwordResetController.resetPassword.bind(passwordResetController));

// ==============================================================================
// GESTÃO DE WORKSPACES (Protegido apenas por Auth)
// ==============================================================================

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Lista todos os workspaces do usuário
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: 'integer' }
 *                   name: { type: 'string' }
 *                   type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'] }
 *   post:
 *     summary: Cria um novo workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: 'string', example: 'Minha Empresa' }
 *               type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'], default: 'PERSONAL' }
 *     responses:
 *       201:
 *         description: Workspace criado
 */
router.get('/workspaces', AuthMiddleware, workspaceController.list.bind(workspaceController));
router.post('/workspaces', AuthMiddleware, workspaceController.create.bind(workspaceController));

/**
 * @swagger
 * /workspaces/{id}:
 *   put:
 *     summary: Atualiza um workspace
 *     tags: [Workspaces]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'integer' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: 'string' }
 *               type: { type: 'string', enum: ['PERSONAL', 'BUSINESS'] }
 *     responses:
 *       200:
 *         description: Workspace atualizado
 */
router.put('/workspaces/:id', AuthMiddleware, workspaceController.update.bind(workspaceController));

// ==============================================================================
// FINANCEIRO (ROTAS PROTEGIDAS POR WORKSPACE)
// ==============================================================================

// --- CATEGORIES ---

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lista categorias (Globais + Customizadas do Workspace)
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     responses:
 *       200:
 *         description: Lista de categorias
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: 'integer' }
 *                   name: { type: 'string' }
 *                   isGlobal: { type: 'boolean' }
 *   post:
 *     summary: Cria uma categoria customizada no Workspace
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: 'string' }
 *               icon: { type: 'string' }
 *               color: { type: 'string' }
 *     responses:
 *       201:
 *         description: Categoria criada
 */
router.get('/categories', AuthMiddleware, WorkspaceMiddleware, categoryController.list.bind(categoryController));
router.post('/categories', AuthMiddleware, WorkspaceMiddleware, categoryController.create.bind(categoryController));

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Remove uma categoria customizada
 *     tags: [Categorias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'integer' }
 *     responses:
 *       204:
 *         description: Removido com sucesso
 *       403:
 *         description: Tentativa de remover categoria Global ou de outro workspace
 */
router.delete('/categories/:id', AuthMiddleware, WorkspaceMiddleware, categoryController.delete.bind(categoryController));

// --- ACCOUNTS ---

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Lista todas as contas do workspace
 *     tags: [Contas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     responses:
 *       200:
 *         description: Lista de contas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: 'string', format: 'uuid' }
 *                   name: { type: 'string' }
 *                   type: { type: 'string' }
 *                   balance: { type: 'string', description: 'Valor decimal como string' }
 *   post:
 *     summary: Cria uma nova conta
 *     tags: [Contas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type]
 *             properties:
 *               name: { type: 'string', example: 'Nubank' }
 *               type: { type: 'string', enum: ['CHECKING', 'CASH', 'SAVINGS', 'INVESTMENT'], example: 'CHECKING' }
 *               initialBalance: { type: 'number', default: 0, example: 100.50 }
 *               isIncludedInTotal: { type: 'boolean', default: true }
 *     responses:
 *       201:
 *         description: Conta criada
 */
router.get('/accounts', AuthMiddleware, WorkspaceMiddleware, accountController.list.bind(accountController));
router.post('/accounts', AuthMiddleware, WorkspaceMiddleware, accountController.create.bind(accountController));

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Atualiza uma conta (Substituição Completa)
 *     tags: [Contas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: 'string' }
 *               type: { type: 'string', enum: ['CHECKING', 'CASH', 'SAVINGS', 'INVESTMENT'] }
 *               isIncludedInTotal: { type: 'boolean' }
 *     responses:
 *       200:
 *         description: Conta atualizada
 */
router.put('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.update.bind(accountController));

/**
 * @swagger
 * /accounts/{id}:
 *   patch:
 *     summary: Atualiza parcialmente uma conta (Ex: apenas o nome)
 *     tags: [Contas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: 'string' }
 *               type: { type: 'string', enum: ['CHECKING', 'CASH', 'SAVINGS', 'INVESTMENT'] }
 *               isIncludedInTotal: { type: 'boolean' }
 *     responses:
 *       200:
 *         description: Conta atualizada
 */
router.patch('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.update.bind(accountController));

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Remove uma conta
 *     tags: [Contas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'uuid' }
 *     responses:
 *       204:
 *         description: Conta removida
 */
router.delete('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.delete.bind(accountController));

// --- TRANSACTIONS ---

/**
 * @swagger
 * /transactions/all:
 *   get:
 *     summary: Lista TODAS as transações do usuário (Todos os Workspaces)
 *     tags: [Transações]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista consolidada de transações
 */
router.get('/transactions/all', AuthMiddleware, transactionController.listAll.bind(transactionController));

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Lista transações do Workspace atual com filtros
 *     tags: [Transações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: query
 *         name: startDate
 *         schema: { type: 'string', format: 'date' }
 *       - in: query
 *         name: endDate
 *         schema: { type: 'string', format: 'date' }
 *       - in: query
 *         name: accountId
 *         schema: { type: 'string', format: 'uuid' }
 *       - in: query
 *         name: type
 *         schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] }
 *     responses:
 *       200:
 *         description: Lista de transações
 *   post:
 *     summary: Cria uma nova transação (Receita ou Despesa)
 *     tags: [Transações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, amount, date, type, accountId, categoryId]
 *             properties:
 *               description: { type: 'string', example: 'Almoço' }
 *               amount: { type: 'number', example: 25.50 }
 *               date: { type: 'string', format: 'date-time' }
 *               type: { type: 'string', enum: ['INCOME', 'EXPENSE'] }
 *               accountId: { type: 'string', format: 'uuid' }
 *               categoryId: { type: 'integer' }
 *               isPaid: { type: 'boolean', default: true }
 *               grossAmount: { type: 'number', example: 120.00, description: 'Valor Bruto (Opcional)' }
 *               marketplaceFee: { type: 'number', example: 10.00, description: 'Taxa da Plataforma (Opcional)' }
 *               shippingCost: { type: 'number', example: 10.00, description: 'Custo de Envio (Opcional)' }
 *               productCost: { type: 'number', example: 30.00, description: 'Custo do Produto (Opcional)' }
 *     responses:
 *       201:
 *         description: Transação criada e saldo atualizado
 */
router.get('/transactions', AuthMiddleware, WorkspaceMiddleware, transactionController.list.bind(transactionController));
router.post('/transactions', AuthMiddleware, WorkspaceMiddleware, transactionController.create.bind(transactionController));

// --- DASHBOARD ---

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Retorna o resumo financeiro (Saldo, Fluxo, Ponto de Equilíbrio)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *       - in: query
 *         name: month
 *         schema: { type: 'integer', example: 1 }
 *         description: Mês (1-12). Se omitido, usa o atual.
 *       - in: query
 *         name: year
 *         schema: { type: 'integer', example: 2026 }
 *         description: Ano. Se omitido, usa o atual.
 *     responses:
 *       200:
 *         description: Resumo financeiro calculado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     month: { type: 'integer' }
 *                     year: { type: 'integer' }
 *                 balance:
 *                   type: object
 *                   properties:
 *                     total: { type: 'number', description: 'Saldo consolidado de todas as contas' }
 *                     label: { type: 'string' }
 *                 flow:
 *                   type: object
 *                   properties:
 *                     income: { type: 'number' }
 *                     expense: { type: 'number' }
 *                     result: { type: 'number', description: 'Receita - Despesa' }
 *                     label: { type: 'string' }
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     fixedExpenses: { type: 'number', description: 'Total de despesas fixas' }
 *                     breakEvenPoint: { type: 'number', description: 'Meta de faturamento para cobrir fixas' }
 *                     coverageRatio: { type: 'number', description: 'Porcentagem das fixas já cobertas' }
 */
router.get('/dashboard/summary', AuthMiddleware, WorkspaceMiddleware, dashboardController.getSummary.bind(dashboardController));

// --- UPLOADS ---

/**
 * @swagger
 * /uploads/presigned:
 *   post:
 *     summary: Solicita uma URL para upload de comprovante
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, contentType]
 *             properties:
 *               fileName: { type: 'string', example: 'comprovante.pdf' }
 *               contentType: { type: 'string', example: 'application/pdf' }
 *     responses:
 *       200:
 *         description: URL gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl: { type: 'string', description: 'URL para fazer PUT do arquivo' }
 *                 publicUrl: { type: 'string', description: 'URL final para salvar no banco' }
 */
router.post('/uploads/presigned', AuthMiddleware, WorkspaceMiddleware, uploadController.requestUploadUrl.bind(uploadController));

// Rota Interna para Simulação Local (Não documentada no Swagger pois é "mágica")
router.put('/uploads/:filename', uploadController.localUploadHandler.bind(uploadController));

export { router };