import { useState, useRef } from 'react';
import axios from 'axios';
import { useCreateTransaction } from './useCreateTransaction';
import { useCreateBridge } from '../../workspaces/hooks/useCreateBridge';
import { useWorkspace } from '../../workspaces/context/useWorkspace';
import { useToast } from '../../../shared/hooks/useToast';
import type { CreateTransactionDTO } from '../types';
import { requestCloudflareUpload } from '../../../services/uploadCloudflare';

export type TransCategory = 'INCOME_SIMPLE' | 'INCOME_MARKETPLACE' | 'EXPENSE' | 'BRIDGE';

export function useTransactionMutation(onSuccessCallback?: () => void) {
    const { success, error: toastError } = useToast();
    const { activeWorkspace } = useWorkspace();

    const { mutate: createTransaction, isPending: isCreating } = useCreateTransaction();
    const { mutate: createBridge, isPending: isBridging } = useCreateBridge();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const isProcessing = isCreating || isBridging || isUploading;
    const abortControllerRef = useRef<AbortController | null>(null);

    const abortUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const submitTransaction = async (data: CreateTransactionDTO, transCategory: TransCategory) => {
        // 1. Fluxo Dedicado Pró-labore (Bridge Transfer)
        if (transCategory === 'BRIDGE') {
            if (!activeWorkspace) {
                toastError('Workspace ativo não encontrado.');
                return;
            }

            if (!data.toWorkspaceId) {
                toastError('Preencha todas as contas para a transferência.');
                return;
            }

            const dto = {
                fromWorkspaceId: activeWorkspace.id,
                toWorkspaceId: data.toWorkspaceId,
                amount: data.amount,
                description: data.description || 'Transferência Pró-labore',
                date: new Date(data.date).toISOString()
            };

            createBridge(dto, {
                onSuccess: () => {
                    success('Pró-labore realizado c/ sucesso! O dinheiro já voou para sua PF.');
                    if (onSuccessCallback) onSuccessCallback();
                },
                onError: (err: Error) => {
                    const axiosError = err as unknown as { response?: { data?: { message?: string } } };
                    toastError(axiosError?.response?.data?.message || 'Falha ao executar Pró-labore.');
                }
            });
            return;
        }

        // 2. Fluxo Convencional (Ganho, Venda PACT, Despesa)

        let finalAttachmentUrl: string | undefined = undefined;

        // Bypass Atômico: Tenta fazer Upload p/ S3 primeiro
        if (data.attachment && activeWorkspace) {
            abortControllerRef.current = new AbortController();

            try {
                setIsUploading(true);
                setUploadProgress(0);

                const uploadData = await requestCloudflareUpload(
                    data.attachment,
                    activeWorkspace.id,
                    (progress) => {
                        const val = Number(progress);
                        setUploadProgress(isNaN(val) ? 0 : val);
                    },
                    abortControllerRef.current.signal
                );

                // Armazena string + quota
                finalAttachmentUrl = uploadData.publicUrl;
                data.attachmentSize = uploadData.size;

                // Sucesso: Removemos o arquivo pesado para não trafegar ao Node.js
                delete data.attachment;

            } catch (err: unknown) {
                setIsUploading(false);
                setUploadProgress(0);

                if (axios.isCancel(err) || (err instanceof Error && err.name === 'CanceledError')) {
                    toastError('Upload cancelado com sucesso.');
                } else if (axios.isAxiosError(err) && err.response?.status === 402) {
                    toastError(err.response.data.message || 'Armazenamento cheio (1GB). Remova recibos antigos.');
                } else {
                    toastError(err instanceof Error ? err.message : 'Falha na conexão de rede ao salvar arquivo.');
                }

                // ABORTO TOTAL: Não disparamos o createTransaction abaixo para proteger o Prisma
                return;
            } finally {
                setIsUploading(false);
            }
        }

        // 3. Tudo seguro -> Gravamos a Transação + Referência R2 no Banco
        // Sanitização do Payload: Remover campos que NÃO pertencem ao schema do Backend
        const sanitizedPayload: Partial<CreateTransactionDTO> & Record<string, unknown> = {
            description: data.description,
            amount: Number(data.amount),
            date: data.date,
            type: data.type === 'BRIDGE' ? 'INCOME' : data.type, // Backend não conhece 'BRIDGE'
            categoryId: Number(data.categoryId),
            isPaid: data.isPaid === true || (data.isPaid as unknown as string) === 'true', // Coerção: <select> envia string
        };

        if (data.accountId && Number(data.accountId) > 0) sanitizedPayload.accountId = Number(data.accountId);

        // Campos opcionais de Marketplace (somente se preenchidos e > 0)
        if (data.grossAmount && Number(data.grossAmount) > 0) sanitizedPayload.grossAmount = Number(data.grossAmount);
        if (data.marketplaceFee && Number(data.marketplaceFee) > 0) sanitizedPayload.marketplaceFee = Number(data.marketplaceFee);
        if (data.shippingCost && Number(data.shippingCost) > 0) sanitizedPayload.shippingCost = Number(data.shippingCost);
        if (data.productCost && Number(data.productCost) > 0) sanitizedPayload.productCost = Number(data.productCost);
        if (data.platformFeeRate && Number(data.platformFeeRate) > 0) sanitizedPayload.platformFeeRate = Number(data.platformFeeRate);

        // Anexo R2 (já processado acima)
        if (finalAttachmentUrl) sanitizedPayload.attachmentUrl = finalAttachmentUrl;
        if (data.attachmentSize && data.attachmentSize > 0) sanitizedPayload.attachmentSize = data.attachmentSize;

        createTransaction(
            sanitizedPayload as CreateTransactionDTO,
            {
                onSuccess: () => {
                    success('Transação registrada com sucesso!');
                    if (onSuccessCallback) onSuccessCallback();
                },
                onError: (err: Error) => {
                    // Extrair mensagem detalhada do Backend
                    const axiosError = err as unknown as { response?: { data?: { message?: string; issues?: Array<{ path: (string | number)[]; message: string }> } } };
                    const backendData = axiosError?.response?.data;

                    if (backendData?.message) {
                        // O backend já retorna uma mensagem formatada em PT-BR
                        toastError(backendData.message);
                    } else if (backendData?.issues && Array.isArray(backendData.issues)) {
                        // Fallback: parser programático da array de issues
                        const fieldErrors = backendData.issues.map(
                            (issue) => `${issue.path.join('.')}: ${issue.message}`
                        );
                        toastError(`Erro de validação: ${fieldErrors.join(' | ')}`);
                    } else {
                        toastError('Falha ao registrar transação. Tente novamente ou verifique sua conexão.');
                    }
                    console.error('[Transaction Error] Detalhes:', backendData || err);
                }
            }
        );
    };

    return {
        submitTransaction,
        isProcessing,
        isUploading,
        uploadProgress,
        abortUpload
    };
}
