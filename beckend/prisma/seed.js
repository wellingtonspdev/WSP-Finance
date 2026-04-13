"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var decimal_js_1 = require("decimal.js");
var prisma = new client_1.PrismaClient();
// ==============================================================================
// 1. EARTHQUAKE PROTOCOL (RESET)
// ==============================================================================
function earthquakeReset() {
    return __awaiter(this, void 0, void 0, function () {
        var tableNames, _i, tableNames_1, tableName, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🧹 Iniciando Protocolo Earthquake (Reset Determinístico)...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 8]);
                    tableNames = [
                        'AuditLog',
                        'Transaction',
                        'Account',
                        'Category',
                        'WorkspaceInvite',
                        'WorkspaceMember',
                        'Workspace',
                        'User'
                    ];
                    _i = 0, tableNames_1 = tableNames;
                    _a.label = 2;
                case 2:
                    if (!(_i < tableNames_1.length)) return [3 /*break*/, 5];
                    tableName = tableNames_1[_i];
                    console.log("- Truncando: ".concat(tableName));
                    return [4 /*yield*/, prisma.$executeRawUnsafe("TRUNCATE TABLE \"".concat(tableName, "\" RESTART IDENTITY CASCADE;"))];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('✅ Ground Zero Estabelecido. Todos os IDs resetados para 1.\n');
                    return [3 /*break*/, 8];
                case 6:
                    err_1 = _a.sent();
                    console.warn('⚠️ Falha no TRUNCATE CASCADE. Tentando fallback para SQLite (deleteMany)...');
                    return [4 /*yield*/, prisma.$transaction([
                            prisma.auditLog.deleteMany(),
                            prisma.transaction.deleteMany(),
                            prisma.account.deleteMany(),
                            prisma.category.deleteMany(),
                            prisma.workspaceInvite.deleteMany(),
                            prisma.workspaceMember.deleteMany(),
                            prisma.workspace.deleteMany(),
                            prisma.user.deleteMany()
                        ])];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// ==============================================================================
// 2. IDENTIDADES
// ==============================================================================
function seedIdentities() {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, wellington, joao, maria, carlos, joaoBusinessId, mariaBusinessId, pastDate;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, bcryptjs_1.default.hash('password123', 10)];
                case 1:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'Wellington Contador', email: 'auditoria@wsp.finance', passwordHash: passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'WSP Consultoria', type: 'BUSINESS' } } } } },
                            include: { memberships: true }
                        })];
                case 2:
                    wellington = _c.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'João Silva', email: 'joao@wsp.finance', passwordHash: passwordHash, memberships: { create: [{ role: 'OWNER', workspace: { create: { name: 'Conta Pessoal do João', type: 'PERSONAL' } } }, { role: 'OWNER', workspace: { create: { name: 'João Dropshipping LTDA', type: 'BUSINESS', taxRate: 6.00 } } }] } },
                            include: { memberships: { include: { workspace: true } } }
                        })];
                case 3:
                    joao = _c.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'Maria Oliveira', email: 'maria@wsp.finance', passwordHash: passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'Maria Tech Solutions', type: 'BUSINESS', taxRate: 15.50 } } } } },
                            include: { memberships: { include: { workspace: true } } }
                        })];
                case 4:
                    maria = _c.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: { name: 'Carlos O Vazio', email: 'vazio@wsp.finance', passwordHash: passwordHash, memberships: { create: { role: 'OWNER', workspace: { create: { name: 'Empresa do Carlos', type: 'BUSINESS' } } } } }
                        })];
                case 5:
                    carlos = _c.sent();
                    joaoBusinessId = (_a = joao.memberships.find(function (m) { return m.workspace.type === 'BUSINESS'; })) === null || _a === void 0 ? void 0 : _a.workspaceId;
                    return [4 /*yield*/, prisma.workspaceMember.create({ data: { userId: wellington.id, workspaceId: joaoBusinessId, role: 'ACCOUNTANT' } })];
                case 6:
                    _c.sent();
                    mariaBusinessId = maria.memberships[0].workspaceId;
                    return [4 /*yield*/, prisma.workspaceMember.create({ data: { userId: wellington.id, workspaceId: mariaBusinessId, role: 'ACCOUNTANT' } })];
                case 7:
                    _c.sent();
                    pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - 2);
                    return [4 /*yield*/, prisma.workspaceInvite.create({ data: { email: 'novo_auditor@teste.com', role: 'ACCOUNTANT', token: 'token_fake_123', status: 'PENDING', workspaceId: joaoBusinessId, inviterId: joao.id, expiresAt: new Date(new Date().setDate(new Date().getDate() + 5)) } })];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, prisma.workspaceInvite.create({ data: { email: 'perdido@teste.com', role: 'ACCOUNTANT', token: 'token_perdido_123', status: 'EXPIRED', workspaceId: mariaBusinessId, inviterId: maria.id, expiresAt: pastDate } })];
                case 9:
                    _c.sent();
                    return [2 /*return*/, { wellington: wellington, joao: joao, joaoBusinessId: joaoBusinessId, joaoPersonalId: (_b = joao.memberships.find(function (m) { return m.workspace.type === 'PERSONAL'; })) === null || _b === void 0 ? void 0 : _b.workspaceId, maria: maria, mariaBusinessId: mariaBusinessId, carlos: carlos }];
            }
        });
    });
}
// ==============================================================================
// 3. ESTRUTURAS BÁSICAS (BANCO)
// ==============================================================================
function seedCategoriesAndAccounts(identities) {
    return __awaiter(this, void 0, void 0, function () {
        var createStructureForWorkspace, joaoBusinessStruct, mariaBusinessStruct, joaoPersonalAcct;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    createStructureForWorkspace = function (workspaceId) { return __awaiter(_this, void 0, void 0, function () {
                        var checkingAccount, cashAccount, catSales, catEnergy, catFees;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, prisma.account.create({ data: { name: 'Conta PJ Nubank', type: 'CHECKING', balance: 0, workspaceId: workspaceId } })];
                                case 1:
                                    checkingAccount = _a.sent();
                                    return [4 /*yield*/, prisma.account.create({ data: { name: 'Caixa Local', type: 'CASH', balance: 0, workspaceId: workspaceId } })];
                                case 2:
                                    cashAccount = _a.sent();
                                    return [4 /*yield*/, prisma.category.create({ data: { name: 'Vendas de Produtos', workspaceId: workspaceId } })];
                                case 3:
                                    catSales = _a.sent();
                                    return [4 /*yield*/, prisma.category.create({ data: { name: 'Energia Elétrica', workspaceId: workspaceId } })];
                                case 4:
                                    catEnergy = _a.sent();
                                    return [4 /*yield*/, prisma.category.create({ data: { name: 'Taxas e Impostos', workspaceId: workspaceId } })];
                                case 5:
                                    catFees = _a.sent();
                                    return [2 /*return*/, { checkingId: checkingAccount.id, cashId: cashAccount.id, catSalesId: catSales.id, catEnergyId: catEnergy.id, catFeesId: catFees.id }];
                            }
                        });
                    }); };
                    return [4 /*yield*/, createStructureForWorkspace(identities.joaoBusinessId)];
                case 1:
                    joaoBusinessStruct = _a.sent();
                    return [4 /*yield*/, createStructureForWorkspace(identities.mariaBusinessId)];
                case 2:
                    mariaBusinessStruct = _a.sent();
                    return [4 /*yield*/, prisma.account.create({ data: { name: 'Itaú Pessoa Física', type: 'CHECKING', balance: 0, workspaceId: identities.joaoPersonalId } })];
                case 3:
                    joaoPersonalAcct = _a.sent();
                    return [2 /*return*/, { joaoB2B: joaoBusinessStruct, mariaB2B: mariaBusinessStruct, joaoPersonal: { checkingId: joaoPersonalAcct.id } }];
            }
        });
    });
}
// ==============================================================================
// 4. MOTOR DO TEMPO
// ==============================================================================
function seedSazonalTransactions(identities, structure) {
    return __awaiter(this, void 0, void 0, function () {
        var count, generateRetroactiveMonths;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    count = 0;
                    generateRetroactiveMonths = function (workspaceId, acctId, catIncomeId, catExpenseId, taxRate) { return __awaiter(_this, void 0, void 0, function () {
                        var today, m, targetDate, isBlackFriday, salesVolumeCount, i, day, txDate, gross, platformFee, taxAmount, net;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    today = new Date();
                                    m = 6;
                                    _a.label = 1;
                                case 1:
                                    if (!(m >= 0)) return [3 /*break*/, 8];
                                    targetDate = new Date(today.getFullYear(), today.getMonth() - m, 15);
                                    isBlackFriday = targetDate.getMonth() === 10;
                                    salesVolumeCount = isBlackFriday ? 45 : 15;
                                    i = 0;
                                    _a.label = 2;
                                case 2:
                                    if (!(i < salesVolumeCount)) return [3 /*break*/, 5];
                                    day = Math.floor(Math.random() * 28) + 1;
                                    txDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
                                    gross = new decimal_js_1.Decimal(Math.random() * 500 + 50);
                                    platformFee = gross.mul(0.18);
                                    taxAmount = gross.mul(taxRate / 100);
                                    net = gross.minus(platformFee).minus(taxAmount);
                                    return [4 /*yield*/, prisma.transaction.create({ data: { accountId: acctId, categoryId: catIncomeId, workspaceId: workspaceId, type: 'INCOME', status: 'COMPLETED', description: "Venda E-commerce #".concat(m).concat(i), date: txDate, grossAmount: gross, feeAmount: platformFee, platformFeeRate: new decimal_js_1.Decimal(18.0), taxAmount: taxAmount, amount: net, netValue: net } })];
                                case 3:
                                    _a.sent();
                                    count++;
                                    _a.label = 4;
                                case 4:
                                    i++;
                                    return [3 /*break*/, 2];
                                case 5: return [4 /*yield*/, prisma.transaction.create({ data: { accountId: acctId, categoryId: catExpenseId, workspaceId: workspaceId, type: 'EXPENSE', status: 'COMPLETED', description: "Conta de Energia B2B - M\u00EAs ".concat(targetDate.getMonth() + 1), date: new Date(targetDate.getFullYear(), targetDate.getMonth(), 10), amount: new decimal_js_1.Decimal("250.75") } })];
                                case 6:
                                    _a.sent();
                                    count++;
                                    _a.label = 7;
                                case 7:
                                    m--;
                                    return [3 /*break*/, 1];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, generateRetroactiveMonths(identities.joaoBusinessId, structure.joaoB2B.checkingId, structure.joaoB2B.catSalesId, structure.joaoB2B.catEnergyId, 6.0)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, generateRetroactiveMonths(identities.mariaBusinessId, structure.mariaB2B.checkingId, structure.mariaB2B.catSalesId, structure.mariaB2B.catEnergyId, 15.5)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, count];
            }
        });
    });
}
// ==============================================================================
// 5. CAOS ENGINE E AUDITORIA
// ==============================================================================
function executeChaosAndAudit(identities, structure) {
    return __awaiter(this, void 0, void 0, function () {
        var count, pastDate, txAlvo, transAtualizada;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    count = 0;
                    pastDate = new Date();
                    pastDate.setMonth(pastDate.getMonth() - 3);
                    return [4 /*yield*/, prisma.transaction.create({ data: { description: 'Documento Fictício Bloqueado Judicialmente (Inadimplência)', amount: new decimal_js_1.Decimal('5000.00'), date: pastDate, dueDate: pastDate, type: 'EXPENSE', status: 'PENDING', accountId: structure.joaoB2B.checkingId, categoryId: structure.joaoB2B.catFeesId, workspaceId: identities.joaoBusinessId } })];
                case 1:
                    _a.sent();
                    count++;
                    return [4 /*yield*/, prisma.transaction.create({ data: { description: 'Aquisição de suprimentos de informática urgentes contendo 35 monitores, 12 teclados mecânicos importados da Alemanha onde o fornecedor atrasou a entrega no porto de Santos e gerou uma multa aduaneira massiva que precisamos contestar.', amount: new decimal_js_1.Decimal('125000.00'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.mariaB2B.checkingId, categoryId: structure.mariaB2B.catEnergyId, workspaceId: identities.mariaBusinessId } })];
                case 2:
                    _a.sent();
                    count++;
                    return [4 /*yield*/, prisma.account.update({ where: { id: structure.joaoB2B.cashId }, data: { balance: new decimal_js_1.Decimal('-1450.99') } })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.transaction.create({ data: { description: 'Rateio de Custo Fixo (1/3 de 1000)', amount: new decimal_js_1.Decimal('333.3333'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.joaoB2B.checkingId, categoryId: structure.joaoB2B.catEnergyId, workspaceId: identities.joaoBusinessId } })];
                case 4:
                    _a.sent();
                    count++;
                    return [4 /*yield*/, prisma.transaction.create({ data: { description: 'Compra Suspeita de Servidor', amount: new decimal_js_1.Decimal('500.00'), date: new Date(), type: 'EXPENSE', status: 'COMPLETED', accountId: structure.mariaB2B.checkingId, categoryId: structure.mariaB2B.catEnergyId, workspaceId: identities.mariaBusinessId } })];
                case 5:
                    txAlvo = _a.sent();
                    count++;
                    return [4 /*yield*/, prisma.auditLog.create({ data: { userId: identities.maria.id, workspaceId: identities.mariaBusinessId, action: 'CREATE', entity: 'Transaction', entityId: txAlvo.id, newState: JSON.parse(JSON.stringify(txAlvo)), ipAddress: '192.168.0.1' } })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.transaction.update({ where: { id: txAlvo.id }, data: { amount: new decimal_js_1.Decimal('200.00'), description: 'Compra de Cadernos' } })];
                case 7:
                    transAtualizada = _a.sent();
                    return [4 /*yield*/, prisma.auditLog.create({ data: { userId: identities.maria.id, workspaceId: identities.mariaBusinessId, action: 'UPDATE', entity: 'Transaction', entityId: transAtualizada.id, oldState: JSON.parse(JSON.stringify(txAlvo)), newState: JSON.parse(JSON.stringify(transAtualizada)), ipAddress: '192.168.0.1' } })];
                case 8:
                    _a.sent();
                    return [2 /*return*/, count];
            }
        });
    });
}
// ==============================================================================
// MASTER ORCHESTRATOR
// ==============================================================================
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var identitiesMap, structureMap, txCount, mixCount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🏭 WSP Finance - The Realistic Engine (Seed V2.2) 🏭\n');
                    return [4 /*yield*/, earthquakeReset()];
                case 1:
                    _a.sent();
                    console.log('🚀 [Fase 1] Criando Atores (Owner, Negócios e Contador)...');
                    return [4 /*yield*/, seedIdentities()];
                case 2:
                    identitiesMap = _a.sent();
                    console.log('🏗️ [Fase 2] Montando Categorias e Contas Correntes...');
                    return [4 /*yield*/, seedCategoriesAndAccounts(identitiesMap)];
                case 3:
                    structureMap = _a.sent();
                    console.log('⏳ [Fase 3] Iniciando Viagem no Tempo e Picos de Vendas (M-6)...');
                    return [4 /*yield*/, seedSazonalTransactions(identitiesMap, structureMap)];
                case 4:
                    txCount = _a.sent();
                    console.log('🌪️ [Fase 4 e 5] Injetando Casos de Borda, Stress Decimal e Governança Sintética...');
                    return [4 /*yield*/, executeChaosAndAudit(identitiesMap, structureMap)];
                case 5:
                    mixCount = _a.sent();
                    console.log('\n=============================================');
                    console.log('🏁 SEED FINALIZADO COM SUCESSO (V2.2)');
                    console.log('=============================================');
                    console.log("\n\uD83D\uDC68\u200D\uD83D\uDCBC Login Contador (Wellington): auditoria@wsp.finance | password123");
                    console.log("\uD83D\uDC68\u200D\uD83D\uDD27 Login Cliente (Jo\u00E3o): joao@wsp.finance | password123");
                    console.log("\uD83D\uDC69\u200D\uD83D\uDCBC Login Cliente (Maria): maria@wsp.finance | password123");
                    console.log("\uD83D\uDC7B Login Fantasma (Carlos): vazio@wsp.finance | password123");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ ERRO FATAL NO SEED ENGINE:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
