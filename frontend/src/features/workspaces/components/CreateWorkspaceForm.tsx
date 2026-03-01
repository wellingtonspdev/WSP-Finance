
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkspaceSchema, type CreateWorkspaceDTO } from '../types';
import { useCreateWorkspace } from '../hooks/useCreateWorkspace';
import { useExternalDocument, useExternalLocation } from '../hooks/useExternalData';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { Loader2, Briefcase, User, MapPin, Building2, Search } from 'lucide-react';
import { useToast } from '../../../shared/hooks/useToast';

export function CreateWorkspaceForm({ onSuccess }: { onSuccess?: () => void }) {
    const { success, error } = useToast();
    const { mutate: createWorkspace, isPending: isCreating } = useCreateWorkspace();
    const { mutateAsync: fetchCnpj, isPending: isFetchingCnpj } = useExternalDocument();
    const { mutateAsync: fetchCep, isPending: isFetchingCep } = useExternalLocation();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateWorkspaceDTO>({
        resolver: zodResolver(createWorkspaceSchema) as any,
        defaultValues: {
            type: 'BUSINESS',
            fiscalIdentity: { documentType: 'CNPJ' }
        }
    });

    const workspaceType = watch('type');
    const documentType = watch('fiscalIdentity.documentType');

    // Trigger CNPJ Auto-Complete
    const handleCnpjBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cnpj = e.target.value.replace(/\D/g, '');
        if (cnpj.length === 14 && documentType === 'CNPJ') {
            try {
                const data = await fetchCnpj(cnpj);
                if (data) {
                    setValue('name', data.tradeName || data.name, { shouldValidate: true });
                    if (data.cnae) setValue('fiscalIdentity.cnae', data.cnae, { shouldValidate: true });
                    if (data.address) {
                        setValue('address.zipCode', data.address.zipCode, { shouldValidate: true });
                        setValue('address.street', data.address.street, { shouldValidate: true });
                        setValue('address.neighborhood', data.address.neighborhood, { shouldValidate: true });
                        setValue('address.city', data.address.city, { shouldValidate: true });
                        setValue('address.state', data.address.state, { shouldValidate: true });
                    }
                    success('Dados da empresa importados com sucesso!');
                }
            } catch (err) {
                error('Não foi possível buscar os dados do CNPJ.');
            }
        }
    };

    // Trigger CEP Auto-Complete
    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const data = await fetchCep(cep);
                if (data) {
                    setValue('address.street', data.street, { shouldValidate: true });
                    setValue('address.neighborhood', data.neighborhood, { shouldValidate: true });
                    setValue('address.city', data.city, { shouldValidate: true });
                    setValue('address.state', data.state, { shouldValidate: true });
                    success('Endereço completado via ViaCEP!');
                }
            } catch (err) {
                error('CEP não encontrado ou indisponível.');
            }
        }
    };

    const onSubmit = (data: CreateWorkspaceDTO) => {
        createWorkspace(data, {
            onSuccess: () => {
                success('Workspace criado com sucesso!');
                onSuccess?.();
            },
            onError: (err: any) => {
                error(err.response?.data?.message || 'Erro ao criar Workspace');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex gap-4 mb-6">
                <label className="flex-1 cursor-pointer">
                    <input type="radio" value="BUSINESS" {...register('type')} className="sr-only peer" />
                    <div className="p-4 border border-white/10 rounded-xl peer-checked:bg-[#D946EF]/20 peer-checked:border-[#D946EF] flex items-center gap-3 transition-all">
                        <Building2 className="w-5 h-5 text-slate-300 peer-checked:text-[#D946EF]" />
                        <span className="font-medium text-slate-200">Empresarial (CNPJ)</span>
                    </div>
                </label>
                <label className="flex-1 cursor-pointer">
                    <input type="radio" value="PERSONAL" {...register('type')} className="sr-only peer" />
                    <div className="p-4 border border-white/10 rounded-xl peer-checked:bg-[#D946EF]/20 peer-checked:border-[#D946EF] flex items-center gap-3 transition-all">
                        <User className="w-5 h-5 text-slate-300 peer-checked:text-[#D946EF]" />
                        <span className="font-medium text-slate-200">Pessoal (CPF)</span>
                    </div>
                </label>
            </div>

            <div className="space-y-4">
                {workspaceType === 'BUSINESS' && (
                    <div className="relative">
                        <Input
                            placeholder="CNPJ"
                            error={errors.fiscalIdentity?.document?.message}
                            {...register('fiscalIdentity.document')}
                            onBlur={handleCnpjBlur}
                            icon={<Search className="w-5 h-5" />}
                            maxLength={18}
                        />
                        {isFetchingCnpj && <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-[#D946EF]" />}
                    </div>
                )}

                {workspaceType === 'PERSONAL' && (
                    <Input
                        placeholder="CPF"
                        error={errors.fiscalIdentity?.document?.message}
                        {...register('fiscalIdentity.document')}
                        icon={<User className="w-5 h-5" />}
                        maxLength={14}
                    />
                )}

                <Input
                    placeholder={workspaceType === 'BUSINESS' ? "Nome Fantasia" : "Seu Nome Completo"}
                    error={errors.name?.message}
                    {...register('name')}
                    icon={<Briefcase className="w-5 h-5" />}
                />

                {workspaceType === 'BUSINESS' && (
                    <Input
                        placeholder="CNAE (Opcional - Usado para cálculo de margem)"
                        error={errors.fiscalIdentity?.cnae?.message}
                        {...register('fiscalIdentity.cnae')}
                    />
                )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Endereço</h3>

                <div className="relative">
                    <Input
                        placeholder="CEP"
                        error={errors.address?.zipCode?.message}
                        {...register('address.zipCode')}
                        onBlur={handleCepBlur}
                        icon={<MapPin className="w-5 h-5" />}
                        maxLength={9}
                    />
                    {isFetchingCep && <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-[#D946EF]" />}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input placeholder="Rua / Logradouro" error={errors.address?.street?.message} {...register('address.street')} />
                    </div>
                    <div className="col-span-1">
                        <Input placeholder="Número" error={errors.address?.number?.message} {...register('address.number')} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Bairro" error={errors.address?.neighborhood?.message} {...register('address.neighborhood')} />
                    <Input placeholder="Complemento" error={errors.address?.complement?.message} {...register('address.complement')} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input placeholder="Cidade" error={errors.address?.city?.message} {...register('address.city')} />
                    </div>
                    <div className="col-span-1">
                        <Input placeholder="UF" error={errors.address?.state?.message} {...register('address.state')} maxLength={2} />
                    </div>
                </div>
            </div>

            <Button type="submit" isLoading={isCreating}>
                Confirmar Workspace
            </Button>
        </form>
    );
}
