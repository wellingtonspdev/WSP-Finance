// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CertificateUploadSection } from '../../src/features/workspaces/components/CertificateUploadSection';
import * as hookModule from '../../src/features/workspaces/hooks/useUploadCertificate';
import { createWrapper } from '../setup/queryWrapper';

// ─── Mock do hook ─────────────────────────────────────────────────────────────
const mockMutateAsync = vi.fn();

function buildHookReturn(overrides: Partial<ReturnType<typeof hookModule.useUploadCertificate>> = {}) {
    return {
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
        ...overrides,
    } as unknown as ReturnType<typeof hookModule.useUploadCertificate>;
}

vi.mock('../../src/features/workspaces/hooks/useUploadCertificate', () => ({
    useUploadCertificate: vi.fn(),
}));

const mockUseUploadCertificate = vi.mocked(hookModule.useUploadCertificate);

// ─── Helper ───────────────────────────────────────────────────────────────────
function makePfxFile(name = 'cert.pfx') {
    return new File(['fake-cert'], name, { type: 'application/x-pkcs12' });
}

function renderSection(workspaceId = 42) {
    return render(<CertificateUploadSection workspaceId={workspaceId} />, {
        wrapper: createWrapper(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CertificateUploadSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseUploadCertificate.mockReturnValue(buildHookReturn());
    });

    // ── Renderização idle ─────────────────────────────────────────────────────

    it('exibe heading e inputs de arquivo e senha no estado idle', () => {
        renderSection();
        expect(screen.getByText(/certificado a1/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/arquivo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
    });

    it('botão enviar está desabilitado quando não há arquivo selecionado', () => {
        renderSection();
        expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
    });

    it('botão enviar fica habilitado após selecionar arquivo e digitar senha', () => {
        renderSection();
        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile()] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'senha123' } });
        expect(screen.getByRole('button', { name: /enviar/i })).toBeEnabled();
    });

    // ── Validação de extensão ─────────────────────────────────────────────────

    it('rejeita arquivo com extensão inválida e exibe mensagem de erro inline', () => {
        renderSection();
        const badFile = new File(['x'], 'cert.exe', { type: 'application/octet-stream' });
        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [badFile] } });
        expect(screen.getByRole('alert')).toHaveTextContent(/\.pfx ou \.p12/i);
        expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
    });

    it('aceita .pfx sem erro inline', () => {
        renderSection();
        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile('c.pfx')] } });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('aceita .p12 sem erro inline', () => {
        renderSection();
        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile('c.p12')] } });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    // ── Estado loading ────────────────────────────────────────────────────────

    it('desabilita botão e exibe spinner quando isPending=true', () => {
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ isPending: true }));
        renderSection();
        const btn = screen.getByRole('button', { name: /enviando/i });
        expect(btn).toBeDisabled();
    });

    // ── Estado sucesso ────────────────────────────────────────────────────────

    it('exibe mensagem de sucesso com expiresInDays e alertLevel após mutação', async () => {
        mockMutateAsync.mockResolvedValueOnce({
            workspaceId: 42,
            certificateExpiresAt: '2027-05-10T23:59:59.000Z',
            expiresInDays: 384,
            alertLevel: 'ok',
        });
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ mutateAsync: mockMutateAsync }));
        renderSection();

        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile()] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'senha123' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
        });

        await waitFor(() => {
            expect(screen.getByRole('status')).toHaveTextContent(/384 dias/i);
        });
    });

    // ── Estado erro ───────────────────────────────────────────────────────────

    it('exibe mensagem de erro 422 (senha incorreta) retornada pelo backend', async () => {
        mockMutateAsync.mockRejectedValueOnce({
            response: { status: 422, data: { message: 'Senha incorreta ou arquivo PFX/P12 inválido.' } },
        });
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ mutateAsync: mockMutateAsync }));
        renderSection();

        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile()] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'errada' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
        });

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/senha incorreta/i);
        });
    });

    it('exibe mensagem de erro 400 (formato inválido) retornada pelo backend', async () => {
        mockMutateAsync.mockRejectedValueOnce({
            response: { status: 400, data: { message: 'Formato de arquivo inválido.' } },
        });
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ mutateAsync: mockMutateAsync }));
        renderSection();

        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile()] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'x' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
        });

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/formato de arquivo inválido/i);
        });
    });

    it('exibe mensagem genérica quando erro não tem response.data.message', async () => {
        mockMutateAsync.mockRejectedValueOnce(new Error('Network Error'));
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ mutateAsync: mockMutateAsync }));
        renderSection();

        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [makePfxFile()] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'x' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
        });

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(/erro ao enviar/i);
        });
    });

    // ── Contrato de chamada ───────────────────────────────────────────────────

    it('chama mutateAsync com o File e a senha corretos ao submeter', async () => {
        mockMutateAsync.mockResolvedValueOnce({
            workspaceId: 42, certificateExpiresAt: '2027-05-01T00:00:00.000Z',
            expiresInDays: 375, alertLevel: 'ok',
        });
        mockUseUploadCertificate.mockReturnValue(buildHookReturn({ mutateAsync: mockMutateAsync }));
        renderSection();

        const file = makePfxFile('empresa.pfx');
        fireEvent.change(screen.getByLabelText(/arquivo/i), { target: { files: [file] } });
        fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'minhasenha' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({ file, password: 'minhasenha' });
    });
});
