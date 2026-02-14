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
const bridgeController = new BridgeController();
const importController = new ImportController();

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
 *   - name: Bridge
 *     description: Transferência entre Workspaces (Pro-labore)
 *   - name: Importação
 *     description: Importação de Extratos Bancários (OFX)
 */

// ==============================================================================
// AUTENTICAÇÃO & IDENTIDADE
// ==============================================================================

// --- AUTH ---
router.post('/auth/register', authController.register.bind(authController));
router.post('/auth/session', authController.authenticate.bind(authController));
router.patch('/auth/refresh', authController.refresh.bind(authController));
router.post('/auth/verify', verificationController.verify.bind(verificationController));
router.post('/auth/resend-verification', verificationController.resend.bind(verificationController));
router.post('/password/forgot', passwordResetController.forgotPassword.bind(passwordResetController));
router.post('/password/reset', passwordResetController.resetPassword.bind(passwordResetController));

// ==============================================================================
// GESTÃO DE WORKSPACES (Protegido apenas por Auth)
// ==============================================================================

router.get('/workspaces', AuthMiddleware, workspaceController.list.bind(workspaceController));
router.post('/workspaces', AuthMiddleware, workspaceController.create.bind(workspaceController));
router.put('/workspaces/:id', AuthMiddleware, workspaceController.update.bind(workspaceController));

// ==============================================================================
// FINANCEIRO (ROTAS PROTEGIDAS POR WORKSPACE)
// ==============================================================================

// --- CATEGORIES ---
router.get('/categories', AuthMiddleware, WorkspaceMiddleware, categoryController.list.bind(categoryController));
router.post('/categories', AuthMiddleware, WorkspaceMiddleware, categoryController.create.bind(categoryController));
router.delete('/categories/:id', AuthMiddleware, WorkspaceMiddleware, categoryController.delete.bind(categoryController));

// --- ACCOUNTS ---
router.get('/accounts', AuthMiddleware, WorkspaceMiddleware, accountController.list.bind(accountController));
router.post('/accounts', AuthMiddleware, WorkspaceMiddleware, accountController.create.bind(accountController));
router.put('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.update.bind(accountController));
router.patch('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.update.bind(accountController));
router.delete('/accounts/:id', AuthMiddleware, WorkspaceMiddleware, accountController.delete.bind(accountController));

// --- TRANSACTIONS ---
router.get('/transactions/all', AuthMiddleware, transactionController.listAll.bind(transactionController));
router.get('/transactions', AuthMiddleware, WorkspaceMiddleware, transactionController.list.bind(transactionController));
router.post('/transactions', AuthMiddleware, WorkspaceMiddleware, transactionController.create.bind(transactionController));

// --- DASHBOARD ---
router.get('/dashboard/summary', AuthMiddleware, WorkspaceMiddleware, dashboardController.getSummary.bind(dashboardController));

// --- UPLOADS ---
router.post('/uploads/presigned', AuthMiddleware, WorkspaceMiddleware, uploadController.requestUploadUrl.bind(uploadController));
router.put('/uploads/:filename', uploadController.localUploadHandler.bind(uploadController));

// --- BRIDGE ---
router.post('/bridge/transfer', AuthMiddleware, bridgeController.transfer.bind(bridgeController));

// --- IMPORTAÇÃO ---

/**
 * @swagger
 * /transactions/import:
 *   post:
 *     summary: "Importa transações de um arquivo OFX"
 *     tags: [Importação]
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
 *             required: [fileName, accountId]
 *             properties:
 *               fileName: { type: 'string', example: 'extrato.ofx', description: 'Nome do arquivo já enviado via /uploads' }
 *               accountId: { type: 'integer', example: 1, description: 'ID da conta onde as transações serão lançadas' }
 *     responses:
 *       200:
 *         description: "Importação concluída"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: 'string' }
 *                 details:
 *                   type: object
 *                   properties:
 *                     imported: { type: 'integer' }
 *                     duplicates: { type: 'integer' }
 */
router.post('/transactions/import', AuthMiddleware, WorkspaceMiddleware, importController.importOFX.bind(importController));

export { router };