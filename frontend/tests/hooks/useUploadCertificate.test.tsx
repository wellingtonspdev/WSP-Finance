// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUploadCertificate } from '../../src/features/workspaces/hooks/useUploadCertificate';
import { api } from '../../src/shared/lib/axios';
import { createWrapper } from '../setup/queryWrapper';
import type { CertificateUploadResponse } from '../../src/features/workspaces/types';

vi.mock('../../src/shared/lib/axios', () => ({
    api: { post: vi.fn() },
}));

const mockSuccessResponse = {
    data: {
        workspaceId: 42,
        certificateExpiresAt: '2027-05-10T23:59:59.000Z',
        expiresInDays: 384,
        alertLevel: 'ok' as const,
    },
};

interface ApiErrorResponse {
    response?: {
        data?: {
            message?: string;
        };
    };
}

function getApiErrorMessage(error: unknown): string | undefined {
    return (error as ApiErrorResponse).response?.data?.message;
}

describe('useUploadCertificate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('constroi FormData com campo certificate (File) e campo password (string)', async () => {
        vi.mocked(api.post).mockResolvedValueOnce(mockSuccessResponse as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });

        const fakeFile = new File(['cert-content'], 'cert.pfx', { type: 'application/x-pkcs12' });

        await act(async () => {
            await result.current.mutateAsync({ file: fakeFile, password: 'senha123' });
        });

        const [, sentBody] = vi.mocked(api.post).mock.calls[0];
        expect(sentBody).toBeInstanceOf(FormData);
        expect(sentBody.get('certificate')).toEqual(fakeFile);
        expect(sentBody.get('password')).toBe('senha123');
    });

    it('chama api.post na URL correta sem Content-Type manual', async () => {
        vi.mocked(api.post).mockResolvedValueOnce(mockSuccessResponse as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });
        const fakeFile = new File(['x'], 'cert.p12');

        await act(async () => {
            await result.current.mutateAsync({ file: fakeFile, password: 'abc' });
        });

        const [url, , config] = vi.mocked(api.post).mock.calls[0];
        expect(url).toBe('/workspaces/42/certificate-a1');
        expect(config).toBeUndefined();
    });

    it('retorna CertificateUploadResponse tipado em sucesso (200)', async () => {
        vi.mocked(api.post).mockResolvedValueOnce(mockSuccessResponse as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });
        const fakeFile = new File(['x'], 'cert.p12');

        let returned: CertificateUploadResponse | undefined;
        await act(async () => {
            returned = await result.current.mutateAsync({ file: fakeFile, password: 'senha' });
        });

        expect(returned).toEqual(mockSuccessResponse.data);
        expect(returned?.alertLevel).toBe('ok');
        expect(returned?.expiresInDays).toBe(384);
    });

    it('propaga message do backend em erro 400 (arquivo invalido)', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            response: { status: 400, data: { message: 'Formato de arquivo invalido.' } },
        } as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });
        const fakeFile = new File(['x'], 'cert.p12');

        await act(async () => {
            await result.current.mutateAsync({ file: fakeFile, password: 'x' }).catch(() => {});
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(getApiErrorMessage(result.current.error)).toBe('Formato de arquivo invalido.');
    });

    it('propaga message do backend em erro 403 (sem permissao)', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            response: { status: 403, data: { message: 'Apenas o OWNER pode enviar certificados.' } },
        } as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({ file: new File(['x'], 'c.p12'), password: 'x' }).catch(() => {});
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(getApiErrorMessage(result.current.error)).toBe('Apenas o OWNER pode enviar certificados.');
    });

    it('propaga message do backend em erro 422 (senha incorreta)', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            response: { status: 422, data: { message: 'Senha incorreta ou arquivo PFX/P12 invalido.' } },
        } as never);

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({ file: new File(['x'], 'c.pfx'), password: 'wrong' }).catch(() => {});
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(getApiErrorMessage(result.current.error)).toBe('Senha incorreta ou arquivo PFX/P12 invalido.');
    });

    it('isPending fica true durante execucao e false apos resolucao', async () => {
        let resolvePromise!: (v: typeof mockSuccessResponse) => void;
        vi.mocked(api.post).mockImplementation(
            () => new Promise((res) => { resolvePromise = res; }) as never
        );

        const { result } = renderHook(() => useUploadCertificate(42), { wrapper: createWrapper() });

        expect(result.current.isPending).toBe(false);

        act(() => {
            result.current.mutate({ file: new File(['x'], 'c.p12'), password: 'x' });
        });

        await waitFor(() => expect(result.current.isPending).toBe(true));

        await act(async () => {
            resolvePromise(mockSuccessResponse);
        });

        await waitFor(() => expect(result.current.isPending).toBe(false));
    });
});
