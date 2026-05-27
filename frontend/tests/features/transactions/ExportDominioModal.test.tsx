import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportDominioModal } from '../../../src/features/transactions/components/ExportDominioModal';
import { TransactionHistoryPage } from '../../../src/features/transactions/pages/TransactionHistoryPage';
import { useWorkspaceStore } from '../../../src/shared/stores/useWorkspaceStore';
import * as exportApi from '../../../src/features/transactions/api/exportDominio';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { UIProvider } from '../../../src/shared/context/UIProvider';

// Mocks
vi.mock('framer-motion', () => ({
    motion: {
        div: 'div'
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('../../../src/shared/stores/useWorkspaceStore');
vi.mock('../../../src/features/transactions/api/exportDominio');
vi.mock('../../../src/features/transactions/hooks/useTransactions', () => ({
    useTransactions: () => ({
        data: { pages: [] },
        isLoading: false,
        isError: false,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
    })
}));
vi.mock('../../../src/features/transactions/hooks/useAttachment', () => ({
    useAttachment: () => ({
        getSignedUrl: vi.fn(),
        isLoading: false,
        error: null,
        clearError: vi.fn(),
    })
}));
vi.mock('../../../src/features/workspaces/context/useWorkspace', () => ({
    useWorkspace: () => ({ activeWorkspace: { id: 1 } })
}));

describe('ExportDominioModal & TransactionHistoryPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window.URL methods
        global.URL.createObjectURL = vi.fn(() => 'mock-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    const renderPage = () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <UIProvider>
                    <MemoryRouter initialEntries={['/1/transactions']}>
                        <Routes>
                            <Route path="/:workspaceId/transactions" element={<TransactionHistoryPage />} />
                        </Routes>
                    </MemoryRouter>
                </UIProvider>
            </QueryClientProvider>
        );
    };

    // T01
    it('T01 — Renderiza botão para OWNER em workspace BUSINESS', () => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector?: any) => {
            const state = { activeMembership: { type: 'BUSINESS', role: 'OWNER' } };
            return selector ? selector(state) : state;
        });
        renderPage();
        expect(screen.getByRole('button', { name: /Exportar Domínio/i })).toBeInTheDocument();
    });

    // T02
    it('T02 — Renderiza botão para ACCOUNTANT em workspace BUSINESS', () => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector?: any) => {
            const state = { activeMembership: { type: 'BUSINESS', role: 'ACCOUNTANT' } };
            return selector ? selector(state) : state;
        });
        renderPage();
        expect(screen.getByRole('button', { name: /Exportar Domínio/i })).toBeInTheDocument();
    });

    // T03
    it('T03 — Não renderiza botão para EDITOR', () => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector?: any) => {
            const state = { activeMembership: { type: 'BUSINESS', role: 'EDITOR' } };
            return selector ? selector(state) : state;
        });
        renderPage();
        expect(screen.queryByRole('button', { name: /Exportar Domínio/i })).not.toBeInTheDocument();
    });

    // T04
    it('T04 — Não renderiza botão para VIEWER', () => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector?: any) => {
            const state = { activeMembership: { type: 'BUSINESS', role: 'VIEWER' } };
            return selector ? selector(state) : state;
        });
        renderPage();
        expect(screen.queryByRole('button', { name: /Exportar Domínio/i })).not.toBeInTheDocument();
    });

    // T05
    it('T05 — Não renderiza botão em workspace não BUSINESS', () => {
        vi.mocked(useWorkspaceStore).mockImplementation((selector?: any) => {
            const state = { activeMembership: { type: 'PERSONAL', role: 'OWNER' } };
            return selector ? selector(state) : state;
        });
        renderPage();
        expect(screen.queryByRole('button', { name: /Exportar Domínio/i })).not.toBeInTheDocument();
    });

    describe('Modal Behavior', () => {
        const renderModal = (isOpen = true) => {
            return render(<ExportDominioModal isOpen={isOpen} onClose={vi.fn()} />);
        };

        // T06
        it('T06 — Modal abre em estado inicial', () => {
            renderModal();
            expect(screen.getByText('Selecione o período para exportação.')).toBeInTheDocument();
            const btnDownload = screen.getByRole('button', { name: /Baixar TXT/i });
            expect(btnDownload).toBeDisabled();
        });

        // T07
        it('T07 — Não valida sem datas obrigatórias', async () => {
            renderModal();
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));
            expect(await screen.findByText('Selecione as datas.')).toBeInTheDocument();
            expect(exportApi.validateDominioExport).not.toHaveBeenCalled();
        });

        // T08
        it('T08 — Não valida quando startDate > endDate', async () => {
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-31' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-01' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));
            expect(await screen.findByText('A data inicial não pode ser maior que a data final.')).toBeInTheDocument();
            expect(exportApi.validateDominioExport).not.toHaveBeenCalled();
        });

        // T09
        it('T09 — Chama /export/validate com payload correto', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(exportApi.validateDominioExport).toHaveBeenCalledWith({
                    layoutId: 'dominio-separated-v1',
                    startDate: '2026-05-01',
                    endDate: '2026-05-31'
                });
            });
        });

        // T10
        it('T10 — Mostra estado validating', async () => {
            let resolvePromise: any;
            vi.mocked(exportApi.validateDominioExport).mockReturnValueOnce(new Promise(resolve => {
                resolvePromise = resolve;
            }));
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            const btnValidar = screen.getByRole('button', { name: 'Validar' });
            fireEvent.click(btnValidar);

            expect(screen.getByText('Validando dados para exportação...')).toBeInTheDocument();
            expect(btnValidar).toBeDisabled();
            expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();

            resolvePromise({ valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: [] });
            await waitFor(() => {
                expect(screen.getByText('Exportação pronta.')).toBeInTheDocument();
            });
        });

        // T11
        it('T11 — Validação sem blockers libera download', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByText('Exportação pronta.')).toBeInTheDocument();
                expect(screen.getByText('Registros encontrados: 10.')).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });
        });

        // T12
        it('T12 — Warnings aparecem e não bloqueiam download', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10,
                warnings: [{ code: 'WARN1', message: 'Warning Message' }], blockers: []
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByText(/Warning Message/i)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });
        });

        // T13
        it('T13 — Blockers aparecem e bloqueiam download', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: false, layoutId: 'dominio-separated-v1', totalRecords: 10,
                warnings: [], blockers: [{ code: 'BLOCK1', message: 'Blocker Message' }]
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByText('Exportação bloqueada.')).toBeInTheDocument();
                expect(screen.getByText(/Blocker Message/i)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();
            });
        });

        // T14, T15, T16
        it('T14, T15, T16 — Download chama /export/generate com payload correto e faz download via Blob sem converter string', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });
            const mockBlob = new Blob(['content'], { type: 'text/plain' });
            vi.mocked(exportApi.generateDominioExport).mockResolvedValueOnce({
                blob: mockBlob, fileName: 'wsp-dominio.txt'
            });

            const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
            const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(function(this: any) {
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            });

            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /Baixar TXT/i }));

            await waitFor(() => {
                expect(exportApi.generateDominioExport).toHaveBeenCalledWith({
                    layoutId: 'dominio-separated-v1',
                    startDate: '2026-05-01',
                    endDate: '2026-05-31'
                });
                expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
                expect(clickSpy).toHaveBeenCalled();
                expect(removeSpy).toHaveBeenCalled();
                expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
            });
            clickSpy.mockRestore();
            removeSpy.mockRestore();
        });

        // T17
        it('T17 — Erro 403 mostra mensagem amigável', async () => {
            vi.mocked(exportApi.validateDominioExport).mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 403 }
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            expect(await screen.findByText('Você não tem permissão para exportar este workspace.')).toBeInTheDocument();
        });

        // T18
        it('T18 — Erro 500 mostra mensagem amigável', async () => {
            vi.mocked(exportApi.validateDominioExport).mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 500 }
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            expect(await screen.findByText('Não foi possível concluir a exportação agora. Tente novamente em instantes.')).toBeInTheDocument();
        });

        // T19
        it('T19 — Alterar período após validação limpa resultado e desabilita download', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });

            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-02' } });

            expect(screen.getByText('Selecione o período para exportação.')).toBeInTheDocument();
            expect(screen.queryByText('Exportação pronta.')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();
        });

        // T20
        it('T20 — Generate 422 como Blob JSON atualiza blockers', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });

            const errorBlob = new Blob([JSON.stringify({ blockers: [{ code: 'BLOB1', message: 'Blob Blocker' }] })], { type: 'application/json' });
            vi.mocked(exportApi.generateDominioExport).mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 422, data: errorBlob }
            });

            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /Baixar TXT/i }));

            await waitFor(() => {
                expect(screen.getByText('Exportação bloqueada.')).toBeInTheDocument();
                expect(screen.getByText(/Blob Blocker/i)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();
            });
        });

        // T21
        it('T21 — Durante validação botões ficam desabilitados', async () => {
            let resolvePromise: any;
            vi.mocked(exportApi.validateDominioExport).mockReturnValueOnce(new Promise(resolve => {
                resolvePromise = resolve;
            }));
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            const btnValidar = screen.getByRole('button', { name: 'Validar' });
            fireEvent.click(btnValidar);

            expect(btnValidar).toBeDisabled();
            expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();

            resolvePromise({ valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: [] });
            await waitFor(() => {
                expect(screen.getByText('Exportação pronta.')).toBeInTheDocument();
            });
        });

        // T22
        it('T22 — Erro 422 amigável sem blockers parseáveis', async () => {
            vi.mocked(exportApi.validateDominioExport).mockResolvedValueOnce({
                valid: true, layoutId: 'dominio-separated-v1', totalRecords: 10, warnings: [], blockers: []
            });
            vi.mocked(exportApi.generateDominioExport).mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 422, data: new Blob(['invalid json'], { type: 'application/json' }) }
            });

            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeEnabled();
            });

            fireEvent.click(screen.getByRole('button', { name: /Baixar TXT/i }));

            expect(await screen.findByText('Não foi possível gerar o arquivo porque existem pendências obrigatórias.')).toBeInTheDocument();
        });

        // T23
        it('T23  Mostra mensagem amigável quando a API retorna 400', async () => {
            vi.mocked(exportApi.validateDominioExport).mockRejectedValueOnce({
                isAxiosError: true,
                response: { status: 400 }
            });
            renderModal();
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });
            fireEvent.change(screen.getByLabelText(/Data Final/i), { target: { value: '2026-05-31' } });
            fireEvent.click(screen.getByRole('button', { name: 'Validar' }));

            expect(await screen.findByText('Período ou layout inválido. Revise as informações e tente novamente.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Baixar TXT/i })).toBeDisabled();
        });

        // T24
        it('T24  Reset ao fechar modal limpa as informações', async () => {
            const onCloseMock = vi.fn();
            const { rerender } = render(<ExportDominioModal isOpen={true} onClose={onCloseMock} />);

            // Simula uso
            fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: '2026-05-01' } });

            // Fecha modal (o botão de X pode ser achado via classe ou pegando o último botão)
            const closeButtons = screen.getAllByRole('button');
            fireEvent.click(closeButtons[0]); // O primeiro botão é o X de fechar
            expect(onCloseMock).toHaveBeenCalled();

            // Reabre
            rerender(<ExportDominioModal isOpen={true} onClose={onCloseMock} />);

            // Verifica que voltou ao estado inicial (Data Inicial vazia e texto inicial)
            expect(screen.getByLabelText(/Data Inicial/i)).toHaveValue('');
            expect(screen.getByText('Selecione o período para exportação.')).toBeInTheDocument();
        });
    });
});
