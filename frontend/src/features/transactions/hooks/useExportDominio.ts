import { useState, useCallback } from 'react';
import { validateDominioExport, generateDominioExport } from '../api/exportDominio';
import type { ExportValidateResponse } from '../types/export';
import { isAxiosError } from 'axios';

export type ModalState = 'idle' | 'validating' | 'ready' | 'blocked' | 'downloading' | 'error';

export function useExportDominio() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [modalState, setModalState] = useState<ModalState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ExportValidateResponse | null>(null);

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') setStartDate(value);
        else setEndDate(value);

        // Reset state on date change
        setModalState('idle');
        setValidationResult(null);
        setErrorMessage(null);
    };

    const reset = useCallback(() => {
        setStartDate('');
        setEndDate('');
        setModalState('idle');
        setValidationResult(null);
        setErrorMessage(null);
    }, []);

    const validate = useCallback(async () => {
        if (!startDate || !endDate) {
            setModalState('error');
            setErrorMessage('Selecione as datas.');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setModalState('error');
            setErrorMessage('A data inicial não pode ser maior que a data final.');
            return;
        }

        setModalState('validating');
        setErrorMessage(null);
        setValidationResult(null);

        try {
            const result = await validateDominioExport({
                layoutId: 'dominio-separated-v1',
                startDate,
                endDate,
            });

            setValidationResult(result);
            if (result.blockers && result.blockers.length > 0) {
                setModalState('blocked');
            } else {
                setModalState('ready');
            }
        } catch (error) {
            setModalState('error');
            if (isAxiosError(error)) {
                if (error.response?.status === 400) {
                    setErrorMessage('Período ou layout inválido. Revise as informações e tente novamente.');
                } else if (error.response?.status === 403) {
                    setErrorMessage('Você não tem permissão para exportar este workspace.');
                } else {
                    setErrorMessage('Não foi possível concluir a exportação agora. Tente novamente em instantes.');
                }
            } else {
                setErrorMessage('Não foi possível concluir a exportação agora. Tente novamente em instantes.');
            }
        }
    }, [startDate, endDate]);

    const download = useCallback(async () => {
        if (modalState !== 'ready') return;

        setModalState('downloading');
        setErrorMessage(null);

        try {
            const { blob, fileName } = await generateDominioExport({
                layoutId: 'dominio-separated-v1',
                startDate,
                endDate,
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);

            setModalState('ready'); // Back to ready after download
        } catch (error) {
            if (isAxiosError(error) && error.response?.data instanceof Blob) {
                // Handle Blob error (e.g. 422)
                const blobError = error.response.data as Blob;
                if (blobError.type === 'application/json') {
                    try {
                        const text = await blobError.text();
                        const json = JSON.parse(text);

                        if (error.response?.status === 422) {
                            if (json.blockers && Array.isArray(json.blockers)) {
                                setValidationResult(prev => ({
                                    ...(prev || { valid: false, layoutId: 'dominio-separated-v1', totalRecords: 0, warnings: [] }),
                                    blockers: json.blockers
                                }));
                            }
                            setModalState('blocked');
                            setErrorMessage(null);
                        } else if (error.response?.status === 403) {
                            setModalState('error');
                            setErrorMessage('Você não tem permissão para exportar este workspace.');
                        } else if (error.response?.status === 400) {
                            setModalState('error');
                            setErrorMessage('Período ou layout inválido. Revise as informações e tente novamente.');
                        } else {
                            setModalState('error');
                            setErrorMessage('Não foi possível concluir a exportação agora. Tente novamente em instantes.');
                        }
                    } catch (parseError) {
                        setModalState('error');
                        setErrorMessage('Não foi possível gerar o arquivo porque existem pendências obrigatórias.');
                    }
                    return;
                }
            }

            setModalState('error');
            if (isAxiosError(error)) {
                if (error.response?.status === 403) {
                    setErrorMessage('Você não tem permissão para exportar este workspace.');
                } else if (error.response?.status === 422) {
                    setErrorMessage('Não foi possível gerar o arquivo porque existem pendências obrigatórias.');
                } else {
                    setErrorMessage('Não foi possível concluir a exportação agora. Tente novamente em instantes.');
                }
            } else {
                setErrorMessage('Não foi possível concluir a exportação agora. Tente novamente em instantes.');
            }
        }
    }, [startDate, endDate, modalState]);

    return {
        startDate,
        endDate,
        modalState,
        errorMessage,
        validationResult,
        handleDateChange,
        validate,
        download,
        setModalState, // Allow closing/resetting modal
        reset
    };
}
