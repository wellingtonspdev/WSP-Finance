import { useState, useCallback } from 'react';
import {
  getTelegramStatus,
  generateTelegramLink,
  revokeTelegramLink,
} from '../api/telegramIntegration';
import type {
  TelegramUserLink,
  GenerateLinkDTO,
  GenerateLinkResponse,
} from '../api/telegramIntegration';

export function useTelegramConfig() {
    const [link, setLink] = useState<TelegramUserLink | null>(null);
    const [generatedLink, setGeneratedLink] = useState<GenerateLinkResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getTelegramStatus();
            setLink(data.link);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar configurações do Telegram');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createLink = useCallback(async (dto: GenerateLinkDTO): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        setGeneratedLink(null);
        try {
            const result = await generateTelegramLink(dto);
            setGeneratedLink(result);
            setSuccessMsg('Código gerado com sucesso!');
            await loadStatus();
            return true;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao gerar código de associação');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [loadStatus]);

    const revokeLink = useCallback(async (id: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await revokeTelegramLink(id);
            setSuccessMsg('Conta desconectada com sucesso.');
            setGeneratedLink(null);
            await loadStatus();
            return true;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao desconectar conta');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [loadStatus]);

    const clearMessages = useCallback(() => {
        setError(null);
        setSuccessMsg(null);
    }, []);

    const clearGeneratedLink = useCallback(() => {
        setGeneratedLink(null);
    }, []);

    return {
        link,
        generatedLink,
        isLoading,
        error,
        successMsg,
        setSuccessMsg,
        loadStatus,
        createLink,
        revokeLink,
        clearMessages,
        clearGeneratedLink,
    };
}
