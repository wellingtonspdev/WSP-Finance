// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAttachment } from '../../src/features/transactions/hooks/useAttachment';
import { api } from '../../src/shared/lib/axios';

// Mocking Axios
vi.mock('../../src/shared/lib/axios', () => {
    return {
        api: {
            get: vi.fn(),
        },
    };
});

describe('useAttachment Hook (Security & Memory)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve lidar com o estado de loading corretamente ao iniciar a busca', async () => {
        (api.get as any).mockImplementation(() => new Promise(() => { })); // Promise que nunca resolve = Loading eterno

        const { result } = renderHook(() => useAttachment());

        expect(result.current.isLoading).toBe(false);

        act(() => {
            result.current.getSignedUrl('tx-123');
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('deve retornar a url assinada e os headers SSE-C em caso de sucesso', async () => {
        const mockResponse = {
            data: {
                downloadUrl: 'https://fake-s3-url.com?expiresIn=300',
                headers: { 'x-amz-server-side-encryption-customer-algorithm': 'AES256' }
            }
        };
        (api.get as any).mockResolvedValueOnce(mockResponse);

        const { result } = renderHook(() => useAttachment());

        let payload: any;

        await act(async () => {
            payload = await result.current.getSignedUrl('tx-123');
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(payload.downloadUrl).toBe(mockResponse.data.downloadUrl);
        expect(payload.headers).toEqual(mockResponse.data.headers);
    });

    it('deve capturar erro 403 e limpar o estado se Invasor tentar acessar anexo', async () => {
        (api.get as any).mockRejectedValueOnce({
            response: {
                status: 403,
                data: { error: 'Transação não encontrada ou você não tem acesso a ela.' }
            }
        });

        const { result } = renderHook(() => useAttachment());

        await act(async () => {
            await result.current.getSignedUrl('tx-403');
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Acesso negado ou anexo indisponível.');
    });
});
