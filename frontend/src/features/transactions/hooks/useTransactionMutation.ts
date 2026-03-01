import { useState, useRef } from 'react';
import axios from 'axios';
import { useCreateTransaction } from './useCreateTransaction';
import { useCreateBridge } from '../../workspaces/hooks/useCreateBridge';
import { useWorkspace } from '../../workspaces/context/WorkspaceProvider';
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

            if (!data.toWorkspaceId || !data.accountId || !data.toAccountId) {
                toastError('Preencha todas as contas para a transferência.');
                return;
            }

            const dto = {
                fromWorkspaceId: activeWorkspace.id,
                toWorkspaceId: data.toWorkspaceId,
                fromAccountId: data.accountId,
                toAccountId: data.toAccountId,
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

            } catch (err: any) {
                setIsUploading(false);
                setUploadProgress(0);

                if (axios.isCancel(err) || err.name === 'CanceledError') {
                    toastError('Upload cancelado com sucesso.');
                } else if (err.response?.status === 402) {
                    toastError(err.response.data.message || 'Armazenamento cheio (1GB). Remova recibos antigos.');
                } else {
                    toastError(err?.message || 'Falha na conexão de rede ao salvar arquivo.');
                }

                // ABORTO TOTAL: Não disparamos o createTransaction abaixo para proteger o Prisma
                return;
            } finally {
                setIsUploading(false);
            }
        }

        // 3. Tudo seguro -> Gravamos a Transação + Referência R2 no Banco
        createTransaction(
            { ...data, attachmentUrl: finalAttachmentUrl },
            {
                onSuccess: () => {
                    success('Transação registrada com sucesso!');
                    if (onSuccessCallback) onSuccessCallback();
                },
                onError: () => {
                    toastError('Falha ao registrar transação. Verifique os dados.');
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
