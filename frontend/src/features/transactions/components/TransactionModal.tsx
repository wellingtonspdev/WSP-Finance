import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionFormSchema } from '../types';
import type { CreateTransactionDTO } from '../types';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useWorkspace } from '../../workspaces/context/WorkspaceProvider';
import { useAccountsByWorkspace } from '../api/getAccountsByWorkspace';
import { useTransactionMutation, type TransCategory } from '../hooks/useTransactionMutation';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { useToast } from '../../../shared/hooks/useToast';
import imageCompression from 'browser-image-compression';
import { useEffect } from 'react';

import {
    X, ArrowUpRight, ArrowDownRight, Store,
    FileText, Calendar, Wallet, Repeat
} from 'lucide-react';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TransactionModal({ isOpen, onClose }: TransactionModalProps) {
    const [transCategory, setTransCategory] = useState<TransCategory>('INCOME_SIMPLE');
    const { error: toastError } = useToast();

    // Contexto Global
    const { activeWorkspace, workspaces } = useWorkspace();

    // Custom Hook Híbrido (Desacoplamento SoC)
    const { submitTransaction, isProcessing, isUploading, uploadProgress, abortUpload } = useTransactionMutation(() => {
        reset();
        onClose();
    });

    // AbortController Ativo (Desistência Graciosa do Usuário)
    useEffect(() => {
        if (!isOpen) {
            abortUpload();
            reset();
        }
    }, [isOpen]);

    // Data Fetchers
    const { data: categories, isLoading: isLoadingCategories } = useCategories();
    const { data: SourceAccounts, isLoading: isLoadingAccounts } = useAccounts();

    const { control, register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateTransactionDTO>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: {
            type: 'INCOME',
            amount: 0,
            isPaid: true,
            categoryId: 0,
            accountId: 0,
            toWorkspaceId: 0,
            toAccountId: 0,
            description: '',
            date: new Date().toISOString().split('T')[0],
        }
    });

    const watchToWorkspaceId = useWatch({ control, name: 'toWorkspaceId' });

    // Carrega dinamicamente contas bancárias do workspace DESTINO selecionado
    const { data: DestinationAccounts, isLoading: isLoadingDestAccounts } = useAccountsByWorkspace(
        watchToWorkspaceId && watchToWorkspaceId !== 0 ? watchToWorkspaceId : null
    );

    // Renderização controlada por AnimatePresence (sem early return)

    const handleCategorySwitch = (cat: TransCategory) => {
        setTransCategory(cat);
        if (cat === 'EXPENSE') setValue('type', 'EXPENSE');
        else if (cat === 'BRIDGE') setValue('type', 'BRIDGE');
        else setValue('type', 'INCOME');

        // Limpa campos específicos do PACT ao trocar para os outros
        if (cat !== 'INCOME_MARKETPLACE') {
            setValue('grossAmount', 0);
            setValue('marketplaceFee', 0);
            setValue('shippingCost', 0);
            setValue('productCost', 0);
        }
    };

    const onSubmit = async (data: CreateTransactionDTO) => {
        try {
            await submitTransaction(data, transCategory);
        } catch (error: any) {
            toastError(error?.message || 'Erro inesperado no formulário. Verifique os dados.');
            console.error('Submit transaction caught error:', error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px]"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />

                    <motion.div
                        className="fixed inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[500px] z-50 flex flex-col h-[92%] md:h-full bg-[#11051f]/85 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/10 rounded-t-[32px] md:rounded-l-[32px] md:rounded-tr-none shadow-2xl"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >

                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        <div className="px-6 pt-4 pb-6 flex items-center justify-between border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Nova Transação</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-6 pb-40">
                            <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                                {/* Top 4 Buttons */}
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySwitch('INCOME_SIMPLE')}
                                        className={`flex flex-col items-center gap-2 py-3 px-1 rounded-xl border transition-all ${transCategory === 'INCOME_SIMPLE' ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transCategory === 'INCOME_SIMPLE' ? 'bg-green-500/30 text-green-400' : 'bg-green-500/10 text-green-400/50'}`}>
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-medium text-center leading-tight ${transCategory === 'INCOME_SIMPLE' ? 'text-white' : 'text-slate-400'}`}>Ganho<br />Simples</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCategorySwitch('INCOME_MARKETPLACE')}
                                        className={`relative flex flex-col items-center gap-2 py-3 px-1 rounded-xl border transition-all transform ${transCategory === 'INCOME_MARKETPLACE' ? 'bg-brand-gradient border-transparent shadow-lg shadow-purple-500/30 scale-105 z-10' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        {transCategory === 'INCOME_MARKETPLACE' && <div className="absolute -top-1.5 -right-1.5 bg-white text-purple-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">PACT</div>}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transCategory === 'INCOME_MARKETPLACE' ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-purple-500/10 text-purple-400/50'}`}>
                                            <Store className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-bold text-center leading-tight ${transCategory === 'INCOME_MARKETPLACE' ? 'text-white' : 'text-slate-400 font-medium'}`}>Venda<br />Mktplace</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCategorySwitch('EXPENSE')}
                                        className={`flex flex-col items-center gap-2 py-3 px-1 rounded-xl border transition-all ${transCategory === 'EXPENSE' ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transCategory === 'EXPENSE' ? 'bg-red-500/30 text-red-400' : 'bg-red-500/10 text-red-400/50'}`}>
                                            <ArrowDownRight className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-medium text-center leading-tight ${transCategory === 'EXPENSE' ? 'text-white' : 'text-slate-400'}`}>Gasto<br />Despesa</span>
                                    </button>

                                    {/* NOVO BOTÃO PRO-LABORE */}
                                    <button
                                        type="button"
                                        onClick={() => handleCategorySwitch('BRIDGE')}
                                        className={`flex flex-col items-center gap-2 py-3 px-1 rounded-xl border transition-all ${transCategory === 'BRIDGE' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${transCategory === 'BRIDGE' ? 'bg-blue-500/30 text-blue-400' : 'bg-blue-500/10 text-blue-400/50'}`}>
                                            <Repeat className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] font-medium text-center leading-tight ${transCategory === 'BRIDGE' ? 'text-white' : 'text-slate-400'}`}>Saque<br />Pró-labore</span>
                                    </button>
                                </div>

                                {/* General Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Descrição</label>
                                        <Input placeholder={transCategory === 'BRIDGE' ? 'Ex: Transferência L2 (Lucros)' : 'Ex: Fone Bluetooth XYZ'} {...register('description')} error={errors.description?.message} icon={<FileText className="w-4 h-4" />} />
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Status</label>
                                        <select {...register('isPaid', { setValueAs: (v: string) => v === 'true' })} className={`w-full bg-white/5 border rounded-xl text-white px-3 py-2.5 outline-none focus:ring-1 focus:ring-purple-500 ${errors.isPaid ? 'border-red-500' : 'border-white/10'}`}>
                                            <option value="true" className="text-black">Pago / Recebido</option>
                                            <option value="false" className="text-black">Pendente</option>
                                        </select>
                                        {errors.isPaid?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.isPaid.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Data</label>
                                            <Input type="date" {...register('date')} error={errors.date?.message} icon={<Calendar className="w-4 h-4" />} />
                                        </div>

                                        {transCategory !== 'BRIDGE' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Status</label>
                                                <select {...register('isPaid', { setValueAs: (v: string) => v === 'true' })} className={`w-full bg-white/5 border rounded-xl text-white px-3 py-2.5 outline-none focus:ring-1 focus:ring-purple-500 ${errors.isPaid ? 'border-red-500' : 'border-white/10'}`}>
                                                    <option value="true" className="text-black">Pago / Recebido</option>
                                                    <option value="false" className="text-black">Pendente</option>
                                                </select>
                                                {errors.isPaid?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.isPaid.message}</p>}
                                            </div>
                                        )}
                                    </div>

                                    {transCategory !== 'INCOME_MARKETPLACE' && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Valor Principal</label>
                                            <Controller
                                                control={control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <MoneyInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        error={errors.amount?.message}
                                                    />
                                                )}
                                            />
                                        </div>
                                    )}

                                    {transCategory === 'INCOME_MARKETPLACE' && (
                                        <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Valor Bruto (Venda Shopee/ML)</label>
                                                <Controller
                                                    control={control} name="grossAmount"
                                                    render={({ field }) => <MoneyInput value={field.value || 0} onChange={field.onChange} error={errors.grossAmount?.message} />}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Taxa da Plataforma</label>
                                                    <Controller
                                                        control={control} name="marketplaceFee"
                                                        render={({ field }) => <MoneyInput value={field.value || 0} onChange={field.onChange} error={errors.marketplaceFee?.message} />}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Custo de Frete</label>
                                                    <Controller
                                                        control={control} name="shippingCost"
                                                        render={({ field }) => <MoneyInput value={field.value || 0} onChange={field.onChange} error={errors.shippingCost?.message} />}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Custo do Produto (Opcional)</label>
                                                <Controller
                                                    control={control} name="productCost"
                                                    render={({ field }) => <MoneyInput value={field.value || 0} onChange={field.onChange} error={errors.productCost?.message} />}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* UPLOAD ATÔMICO R2 BYPASS (Opcional) - Posicionado ANTES dos selects para não sobrepor os dropdowns nativos */}
                                    <div className="pt-2 pb-2">
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Comprovante de Pagamento (Nuvem)</label>
                                        <Controller
                                            control={control}
                                            name="attachment"
                                            render={({ field: { value, onChange, ...field } }) => (
                                                <div>
                                                    <input
                                                        {...field}
                                                        type="file"
                                                        accept="image/jpeg,image/png,application/pdf"
                                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
                                                        value={value?.fileName}
                                                        onChange={async (e) => {
                                                            let file = e.target.files?.[0];

                                                            if (file) {
                                                                // V3.8 Shrinking Engine
                                                                if (file.type.startsWith('image/')) {
                                                                    const options = {
                                                                        maxSizeMB: 1,
                                                                        maxWidthOrHeight: 1920,
                                                                        useWebWorker: true,
                                                                        fileType: file.type
                                                                    };
                                                                    try {
                                                                        const compressedBlob = await imageCompression(file, options);
                                                                        file = new File([compressedBlob], file.name, {
                                                                            type: file.type,
                                                                            lastModified: Date.now(),
                                                                        });
                                                                    } catch (error) {
                                                                        console.error('Falha ao comprimir imagem:', error);
                                                                    }
                                                                }
                                                                onChange(file);
                                                            } else {
                                                                onChange(undefined);
                                                            }
                                                        }}
                                                    />
                                                    {value?.name && (
                                                        <p className="text-xs text-purple-400 mt-2 font-medium">Arquivo pronto: {value.name}</p>
                                                    )}
                                                </div>
                                            )}
                                        />
                                        {isUploading && (
                                            <div className="mt-3 w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                                <p className="text-[10px] text-right mt-1 text-purple-400 font-medium">{uploadProgress}% Transferido (R2 Bypass)</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* CONDICIONAL: SE FOR TRANSAÇÃO GLOBAL, MOSTRA AS CATEGORIAS */}
                                    {transCategory !== 'BRIDGE' && (
                                        <div className="grid grid-cols-2 gap-4 pt-2 pb-6 relative z-50">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Categoria</label>
                                                <Controller
                                                    control={control}
                                                    name="categoryId"
                                                    render={({ field }) => (
                                                        <CustomSelect
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            options={categories?.map(c => ({ value: c.id, label: c.name })) || []}
                                                            disabled={isLoadingCategories}
                                                            error={errors.categoryId?.message}
                                                            placeholder="Selecione..."
                                                        />
                                                    )}
                                                />
                                                {errors.categoryId?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.categoryId.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta Bancária</label>
                                                <Controller
                                                    control={control}
                                                    name="accountId"
                                                    render={({ field }) => (
                                                        <CustomSelect
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            options={SourceAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                            disabled={isLoadingAccounts}
                                                            error={errors.accountId?.message}
                                                            placeholder="Selecione..."
                                                        />
                                                    )}
                                                />
                                                {errors.accountId?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.accountId.message}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* CONDICIONAL: SE FOR PRÓ-LABORE, MOSTRA INTERFACE ESPECIAL */}
                                    {transCategory === 'BRIDGE' && (
                                        <div className="space-y-4 pt-2 p-4 pb-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl relative z-40">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Wallet className="w-4 h-4 text-blue-400" />
                                                <h3 className="text-sm font-semibold text-blue-200">De onde o dinheiro vai sair?</h3>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta de Origem ({activeWorkspace?.type === 'BUSINESS' ? 'Empresa Atual' : 'Pessoal Atual'})</label>
                                                <Controller
                                                    control={control}
                                                    name="accountId"
                                                    render={({ field }) => (
                                                        <CustomSelect
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            options={SourceAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                            disabled={isLoadingAccounts}
                                                            placeholder="Selecione a conta que irá pagar..."
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="w-full h-px bg-white/10 my-4" />

                                            <div className="flex items-center gap-2 mb-2">
                                                <Repeat className="w-4 h-4 text-purple-400" />
                                                <h3 className="text-sm font-semibold text-purple-200">Para onde ele vai?</h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Ambiente de Destino</label>
                                                    <Controller
                                                        control={control}
                                                        name="toWorkspaceId"
                                                        render={({ field }) => (
                                                            <CustomSelect
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                options={workspaces.filter(w => w.id !== activeWorkspace?.id).map(w => ({
                                                                    value: w.id,
                                                                    label: `${w.type === 'BUSINESS' ? '🏢 ' : '👤 '} ${w.name}`
                                                                }))}
                                                                placeholder="Selecione..."
                                                            />
                                                        )}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta que vai Receber</label>
                                                    <Controller
                                                        control={control}
                                                        name="toAccountId"
                                                        render={({ field }) => (
                                                            <CustomSelect
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                options={DestinationAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                                disabled={isLoadingDestAccounts || !watchToWorkspaceId}
                                                                placeholder={isLoadingDestAccounts ? 'Buscando contas...' : 'Selecione...'}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Custo do Produto (Opcional)</label>
                                        <Controller
                                            control={control} name="productCost"
                                            render={({ field }) => <MoneyInput value={field.value || 0} onChange={field.onChange} error={errors.productCost?.message} />}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* UPLOAD ATÔMICO R2 BYPASS (Opcional) - Posicionado ANTES dos selects para não sobrepor os dropdowns nativos */}
                            <div className="pt-2 pb-2">
                                <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Comprovante de Pagamento (Nuvem)</label>
                                <Controller
                                    control={control}
                                    name="attachment"
                                    render={({ field: { value, onChange, ...field } }) => (
                                        <div>
                                            <input
                                                {...field}
                                                type="file"
                                                accept="image/jpeg,image/png,application/pdf"
                                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
                                                value={value?.fileName}
                                                onChange={async (e) => {
                                                    let file = e.target.files?.[0];

                                                    if (file) {
                                                        // V3.8 Shrinking Engine
                                                        if (file.type.startsWith('image/')) {
                                                            const options = {
                                                                maxSizeMB: 1,
                                                                maxWidthOrHeight: 1920,
                                                                useWebWorker: true,
                                                                fileType: file.type
                                                            };
                                                            try {
                                                                const compressedBlob = await imageCompression(file, options);
                                                                file = new File([compressedBlob], file.name, {
                                                                    type: file.type,
                                                                    lastModified: Date.now(),
                                                                });
                                                            } catch (error) {
                                                                console.error('Falha ao comprimir imagem:', error);
                                                            }
                                                        }
                                                        onChange(file);
                                                    } else {
                                                        onChange(undefined);
                                                    }
                                                }}
                                            />
                                            {value?.name && (
                                                <p className="text-xs text-purple-400 mt-2 font-medium">Arquivo pronto: {value.name}</p>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </form>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-[#0f0518]/95 backdrop-blur-xl border-t border-white/5 pt-4 pb-8 px-6 rounded-t-2xl md:rounded-none">
                            {/* transCategory === 'INCOME_MARKETPLACE' && (PredictiveYield) */}

                            <Button type="submit" form="transaction-form" isLoading={isProcessing} className={`w-full h-14 text-lg ${transCategory === 'BRIDGE' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : ''}`}>
                                {transCategory === 'BRIDGE' ? 'Efetuar Transferência' : 'Registrar Transação'}
                            </Button>
                            <div className="h-1 w-1/3 bg-white/10 rounded-full mx-auto mt-6 md:hidden" />
                            {/* CONDICIONAL: SE FOR TRANSAÇÃO GLOBAL, MOSTRA AS CATEGORIAS */}
                            {transCategory !== 'BRIDGE' && (
                                <div className="grid grid-cols-2 gap-4 pt-2 pb-6 relative z-50">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Categoria</label>
                                        <Controller
                                            control={control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <CustomSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={categories?.map(c => ({ value: c.id, label: c.name })) || []}
                                                    disabled={isLoadingCategories}
                                                    error={errors.categoryId?.message}
                                                    placeholder="Selecione..."
                                                />
                                            )}
                                        />
                                        {errors.categoryId?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.categoryId.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta Bancária</label>
                                        <Controller
                                            control={control}
                                            name="accountId"
                                            render={({ field }) => (
                                                <CustomSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={SourceAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                    disabled={isLoadingAccounts}
                                                    error={errors.accountId?.message}
                                                    placeholder="Selecione..."
                                                />
                                            )}
                                        />
                                        {errors.accountId?.message && <p className="text-red-500 text-xs mt-1 ml-1">{errors.accountId.message}</p>}
                                    </div>
                                </div>
                            )}

                            {/* CONDICIONAL: SE FOR PRÓ-LABORE, MOSTRA INTERFACE ESPECIAL */}
                            {transCategory === 'BRIDGE' && (
                                <div className="space-y-4 pt-2 p-4 pb-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl relative z-40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wallet className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-sm font-semibold text-blue-200">De onde o dinheiro vai sair?</h3>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta de Origem ({activeWorkspace?.type === 'BUSINESS' ? 'Empresa Atual' : 'Pessoal Atual'})</label>
                                        <Controller
                                            control={control}
                                            name="accountId"
                                            render={({ field }) => (
                                                <CustomSelect
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={SourceAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                    disabled={isLoadingAccounts}
                                                    placeholder="Selecione a conta que irá pagar..."
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="w-full h-px bg-white/10 my-4" />

                                    <div className="flex items-center gap-2 mb-2">
                                        <Repeat className="w-4 h-4 text-purple-400" />
                                        <h3 className="text-sm font-semibold text-purple-200">Para onde ele vai?</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Ambiente de Destino</label>
                                            <Controller
                                                control={control}
                                                name="toWorkspaceId"
                                                render={({ field }) => (
                                                    <CustomSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={workspaces.filter(w => w.id !== activeWorkspace?.id).map(w => ({
                                                            value: w.id,
                                                            label: `${w.type === 'BUSINESS' ? '🏢 ' : '👤 '} ${w.name}`
                                                        }))}
                                                        placeholder="Selecione..."
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-2 ml-1">Conta que vai Receber</label>
                                            <Controller
                                                control={control}
                                                name="toAccountId"
                                                render={({ field }) => (
                                                    <CustomSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        options={DestinationAccounts?.map(a => ({ value: a.id, label: a.name })) || []}
                                                        disabled={isLoadingDestAccounts || !watchToWorkspaceId}
                                                        placeholder={isLoadingDestAccounts ? 'Buscando contas...' : 'Selecione...'}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
