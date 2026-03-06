import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, AlertTriangle, ArrowRight, Search, MoreVertical } from 'lucide-react';
import { useAuth } from '../../../app/AuthProvider';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';
import { AppLayout } from '../../../shared/components/layout/AppLayout';
import { HealthStatusBadge } from '../components/HealthStatusBadge';
import { ActivityFeed } from '../components/ActivityFeed';
import { AccountantMobileHeader } from '../components/AccountantMobileHeader';
import type { ActivityEvent } from '../components/ActivityFeed';

export function AccountantHubPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { memberships, setActiveWorkspaceId } = useWorkspaceStore();

    // Filtra as memberships para pegar apenas aquelas onde o user é ACCOUNTANT
    const clientMemberships = memberships.filter(m => m.role === 'ACCOUNTANT');

    // Ao entrar no HUB, desativamos o workspace atual do Zustand para garantir uma "página neutra"
    useEffect(() => {
        setActiveWorkspaceId(null);
    }, [setActiveWorkspaceId]);

    // Se ele não for contador de ninguém, ele não deveria nem estar aqui, mas mostraremos vazio.
    const activeClients = clientMemberships.length;
    // Esses valores podem vir da API no futuro (/accountant/summary), faremos mock realista por enquanto
    const pendingDocs = clientMemberships.length * 3;
    const criticalAlerts = clientMemberships.length > 0 ? 2 : 0;

    const handleAccessClient = (workspaceId: number) => {
        navigate(`/${workspaceId}/dashboard`);
    };

    // Mocks de Feed para o Aside Direito (Prototipação)
    const mockEvents: ActivityEvent[] = [
        { id: '1', type: 'warning', description: 'Malha fina evitada: Inconsistência no NCM do cliente Dropship X resolvida.', timeAgo: 'há 10 min' },
        { id: '2', type: 'success', description: 'Impostos provisionados para a conta Tech Solutions.', timeAgo: 'há 2 horas' },
        { id: '3', type: 'info', description: 'Você aceitou o convite do Workspace "Agência Criativa".', timeAgo: 'ontem' },
        { id: '4', type: 'success', description: 'Conciliação OFX finalizada.', timeAgo: 'ontem' }
    ];

    return (
        <AppLayout>
            <div className="flex flex-col xl:grid xl:grid-cols-[1fr_320px] gap-6 xl:gap-8 w-full max-w-full">
                <div className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden lg:pb-8">

                    {/* Header Pessoal exclusivo para Mobile (No desktop o Header fica na Sidebar) */}
                    <AccountantMobileHeader />

                    {/* Header Central da Coluna 2 */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 md:px-0">
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight hidden lg:block">Olá, {user?.name.split(' ')[0]}</h1>
                            <p className="text-sm text-slate-400">Resumo da sua auditoria e pendências ativas.</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar cliente ou documento..."
                                className="w-full md:w-64 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1978e5] transition-colors"
                            />
                        </div>
                    </header>

                    {/* KPI Summary Cards - HTML Driven snap-x */}
                    <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-3 md:pb-0 mb-8 w-full min-w-0">
                        {/* Card 1: Total Clientes */}
                        <div className="bg-[#1978e5]/[0.05] backdrop-blur-[12px] border border-white/[0.08] p-5 rounded-2xl flex flex-col gap-1 min-w-[85%] snap-center md:min-w-0">
                            <Users className="w-5 h-5 text-[#1978e5] mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Clientes Ativos</p>
                            <h3 className="text-3xl font-bold text-white">{activeClients}</h3>
                            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                                <span className="font-bold">+3 este mês</span>
                            </p>
                        </div>

                        {/* Card 2: Documentos Pendentes */}
                        <div className="bg-[#1978e5]/[0.05] backdrop-blur-[12px] border border-white/[0.08] p-5 rounded-2xl flex flex-col gap-1 min-w-[85%] snap-center md:min-w-0">
                            <FileText className="w-5 h-5 text-amber-500 mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Documentos Pendentes</p>
                            <h3 className="text-3xl font-bold text-white">{pendingDocs}</h3>
                            <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                                <span className="font-bold">Atenção ao prazo</span>
                            </p>
                        </div>

                        {/* Card 3: Alertas Críticos */}
                        <div className="bg-[#1978e5]/[0.05] backdrop-blur-[12px] border border-white/[0.08] p-5 rounded-2xl flex flex-col gap-1 min-w-[85%] snap-center md:min-w-0">
                            <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Alertas Críticos</p>
                            <h3 className="text-3xl font-bold text-white">{criticalAlerts}</h3>
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <span className="font-bold">Ações imediatas</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-4 px-4 md:px-0">
                        <h2 className="text-xl font-bold tracking-tight">Torre de Comando</h2>
                        <div className="flex bg-[#1978e5]/[0.05] border border-white/5 p-1 rounded-lg self-start">
                            <button className="px-4 py-1.5 text-xs font-bold rounded-md bg-[#1978e5] text-white shadow-sm transition-all whitespace-nowrap">
                                Todos ({activeClients})
                            </button>
                            <button className="px-4 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white transition-all whitespace-nowrap">
                                Pendências (1)
                            </button>
                            <button className="px-4 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white transition-all whitespace-nowrap">
                                OK ({activeClients > 0 ? activeClients - 1 : 0})
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-6 px-4 md:px-0">
                        <div className="relative w-full">
                            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                className="w-full bg-[#1978e5]/[0.05] backdrop-blur-[12px] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-[#1978e5] focus:ring-1 focus:ring-[#1978e5] outline-none transition-all placeholder:text-slate-500 text-white"
                                placeholder="Buscar cliente ou documento..."
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Renderização Híbrida de Clientes (Table Desktop vs Cards Mobile) */}
                    <div className="flex-1">

                        {/* 1. Versão Desktop: Tabela */}
                        <div className="hidden md:block bg-[#11051f]/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status Linter</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Última Atividade</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {clientMemberships.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                                                    Nenhum cliente ativo no momento.
                                                </td>
                                            </tr>
                                        )}
                                        {clientMemberships.map((membership, index) => (
                                            <tr key={membership.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-white/10 shadow-inner shrink-0 text-white font-bold">
                                                            {membership.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{membership.name}</h3>
                                                            <p className="text-xs text-slate-500 mt-0.5 capitalize">{membership.role.toLowerCase()}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {index === 0 ? (
                                                        <HealthStatusBadge status="urgent" label="Furo Contábil" />
                                                    ) : index === 1 ? (
                                                        <HealthStatusBadge status="attention" label="Revisar" />
                                                    ) : (
                                                        <HealthStatusBadge status="stable" label="Sincronizado" />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-300">Rotina diária concluída</span>
                                                        <span className="text-[10px] text-slate-500 mt-0.5">há {index + 1} dia(s)</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAccessClient(membership.id)}
                                                            className="px-4 py-2 rounded-lg bg-[#1978e5]/10 text-[#1978e5] hover:bg-[#1978e5]/20 border border-[#1978e5]/20 font-semibold text-xs transition-all flex items-center gap-2 group-hover:shadow-[0_0_10px_rgba(25,120,229,0.3)]"
                                                        >
                                                            Acessar Workspace
                                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                                        </button>
                                                        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Versão Mobile: Filtros Rápidos + Cards HTML Driven */}
                        <div className="flex flex-col gap-4 md:hidden mt-4 px-4">

                            {clientMemberships.length === 0 && (
                                <div className="py-10 text-center text-slate-400 bg-white/5 rounded-2xl border border-white/10">
                                    Nenhum cliente ativo no momento.
                                </div>
                            )}

                            <div className="space-y-3">
                                {clientMemberships.map((membership, index) => (
                                    <div key={membership.id} className="bg-white/5 backdrop-blur-[12px] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1a0b2e] to-[#1978e5]/20 flex items-center justify-center border border-white/10 shadow-inner shrink-0 text-white font-bold overflow-hidden">
                                                {membership.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-white truncate max-w-[150px]">{membership.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {index === 0 ? (
                                                        <>
                                                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">Crítico</span>
                                                            <span className="text-[10px] text-slate-500">Urgente</span>
                                                        </>
                                                    ) : index === 1 ? (
                                                        <>
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">Pendente</span>
                                                            <span className="text-[10px] text-slate-500">Aguardando NFs</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">OK</span>
                                                            <span className="text-[10px] text-slate-500">Tudo em dia</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="hidden md:block text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Última Atividade</p>
                                                <p className="text-xs font-medium text-slate-300">há {index + 1} dia(s)</p>
                                            </div>
                                            <button
                                                onClick={() => handleAccessClient(membership.id)}
                                                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-[#1978e5] group-hover:text-white transition-all shadow-sm"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Terceira Coluna: Activity Feed (Fixo na direita no Desktop, Empilhado abaixo no Mobile) */}
                <ActivityFeed events={mockEvents} />
            </div>
        </AppLayout >
    );
}
