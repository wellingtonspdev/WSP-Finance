// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCertificateAlertState } from '../../src/shared/lib/certificate';

// Relógio congelado em: 2025-06-15T12:00:00.000Z
// Garante estabilidade total — sem flakiness em borda de data
const FROZEN_NOW = '2025-06-15T12:00:00.000Z';

describe('getCertificateAlertState', () => {

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(FROZEN_NOW));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('retorna null quando certificateExpiresAt é null', () => {
        expect(getCertificateAlertState(null)).toBeNull();
    });

    it('retorna ok quando expira em mais de 30 dias', () => {
        // 2025-06-15 + 60 dias = 2025-08-14
        const result = getCertificateAlertState('2025-08-14T12:00:00.000Z');
        expect(result?.level).toBe('ok');
        expect(result?.expiresInDays).toBe(60);
    });

    it('retorna warning quando expira em exatamente 30 dias (threshold inclusivo)', () => {
        // Math.ceil(30 * 86_400_000 / 86_400_000) = 30 → warning (≤ 30)
        const result = getCertificateAlertState('2025-07-15T12:00:00.000Z');
        expect(result?.level).toBe('warning');
        expect(result?.expiresInDays).toBe(30);
    });

    it('retorna warning quando expira em 1 dia', () => {
        const result = getCertificateAlertState('2025-06-16T12:00:00.000Z');
        expect(result?.level).toBe('warning');
        expect(result?.expiresInDays).toBe(1);
    });

    it('retorna expired quando a data de expiração está no passado', () => {
        // 30 dias atrás
        const result = getCertificateAlertState('2025-05-16T12:00:00.000Z');
        expect(result?.level).toBe('expired');
        expect(result?.expiresInDays).toBeLessThan(0);
    });

    it('retorna expired quando a data é exatamente agora (diffMs = 0, ceil(0) = 0 → warning)', () => {
        // Borda: expiresInDays = Math.ceil(0) = 0 → 0 ≤ 30 → warning (não expired)
        // Espelho do backend: expiresInDays < 0 é expired; 0 ainda é warning
        const result = getCertificateAlertState(FROZEN_NOW);
        expect(result?.level).toBe('warning');
        expect(result?.expiresInDays).toBe(0);
    });
});
