// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CertificateAlertBadge } from '../../src/features/accountant/components/CertificateAlertBadge';

describe('CertificateAlertBadge', () => {

    // ── null → sem certificado ──────────────────────────────────────────────

    it('renderiza "Não enviado" quando certificateExpiresAt é null', () => {
        render(<CertificateAlertBadge certificateExpiresAt={null} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/não enviado/i);
        expect(badge.className).toMatch(/red/);
    });

    // ── level ok ─────────────────────────────────────────────────────────────

    it('exibe label "Válido" e cor verde quando certificate não vence em ≤ 30 dias', () => {
        // +60 dias a partir de agora (ok)
        const future = new Date(Date.now() + 60 * 86_400_000).toISOString();
        render(<CertificateAlertBadge certificateExpiresAt={future} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/válido/i);
        expect(badge.className).toMatch(/emerald/);
    });

    // ── level warning ────────────────────────────────────────────────────────

    it('exibe label "Expira em X dias" e cor âmbar quando restam ≤ 30 dias', () => {
        const soon = new Date(Date.now() + 15 * 86_400_000).toISOString();
        render(<CertificateAlertBadge certificateExpiresAt={soon} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/expira em 15 dias/i);
        expect(badge.className).toMatch(/amber/);
    });

    it('exibe label "Expira hoje" quando expiresInDays = 0', () => {
        // exatamente agora → Math.ceil(0) = 0 → warning
        render(<CertificateAlertBadge certificateExpiresAt={new Date().toISOString()} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/expira hoje/i);
        expect(badge.className).toMatch(/amber/);
    });

    it('exibe label "Expira em 1 dia" (singular) quando restam exatamente 1 dia', () => {
        const oneDayAhead = new Date(Date.now() + 1 * 86_400_000).toISOString();
        render(<CertificateAlertBadge certificateExpiresAt={oneDayAhead} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/expira em 1 dia/i);
    });

    // ── level expired ────────────────────────────────────────────────────────

    it('exibe label "Expirado" e cor vermelha quando já venceu', () => {
        const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
        render(<CertificateAlertBadge certificateExpiresAt={past} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/expirado/i);
        expect(badge.className).toMatch(/red/);
    });

    // ── acessibilidade ───────────────────────────────────────────────────────

    it('tem role="status" em todos os níveis não-nulos', () => {
        const future = new Date(Date.now() + 60 * 86_400_000).toISOString();
        render(<CertificateAlertBadge certificateExpiresAt={future} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
