import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// ── Types (will be created in types/index.ts) ──
type AIInsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AIInsightForTransaction {
  id: string;
  transactionId: string;
  severity: AIInsightSeverity;
  code?: string;
  message: string;
  reason?: string | null;
  confidence?: string | number | null;
  dismissed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Import will work after component is created
import { AIInsightBadge } from '../../../src/features/transactions/components/AIInsightBadge';

// ═══════════════════════════════════════════════════════════════════
// AIInsightBadge Unit Tests
// ═══════════════════════════════════════════════════════════════════
describe('AIInsightBadge', () => {
  afterEach(() => {
    cleanup();
  });

  const makeInsight = (overrides?: Partial<AIInsightForTransaction>): AIInsightForTransaction => ({
    id: 'insight-001',
    transactionId: 'tx-001',
    severity: 'WARNING',
    code: 'MISTURA_PATRIMONIAL',
    message: 'Possível mistura patrimonial detectada',
    reason: 'Despesa pessoal em conta PJ',
    confidence: 0.75,
    dismissed: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  });

  // ── T01: Renders INFO severity ──
  it('T01 — renders INFO severity with distinct visual', () => {
    render(<AIInsightBadge insight={makeInsight({ severity: 'INFO' })} />);
    const badge = screen.getByTestId('ai-insight-badge');
    expect(badge).toBeInTheDocument();
    // INFO should render with info-like styling
    expect(badge.textContent).toContain('Possível mistura patrimonial detectada');
  });

  // ── T02: Renders WARNING severity ──
  it('T02 — renders WARNING severity with distinct visual', () => {
    render(<AIInsightBadge insight={makeInsight({ severity: 'WARNING' })} />);
    const badge = screen.getByTestId('ai-insight-badge');
    expect(badge).toBeInTheDocument();
  });

  // ── T03: Renders CRITICAL severity ──
  it('T03 — renders CRITICAL severity with distinct visual', () => {
    render(<AIInsightBadge insight={makeInsight({ severity: 'CRITICAL' })} />);
    const badge = screen.getByTestId('ai-insight-badge');
    expect(badge).toBeInTheDocument();
  });

  // ── T04: Returns null for null insight ──
  it('T04 — returns null for null insight', () => {
    const { container } = render(<AIInsightBadge insight={null} />);
    expect(container.innerHTML).toBe('');
  });

  // ── T05: Returns null for undefined insight ──
  it('T05 — returns null for undefined insight', () => {
    const { container } = render(<AIInsightBadge insight={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  // ── T06: Returns null for dismissed insight ──
  it('T06 — returns null for dismissed=true insight', () => {
    const { container } = render(<AIInsightBadge insight={makeInsight({ dismissed: true })} />);
    expect(container.innerHTML).toBe('');
  });

  // ── T07: Shows short message ──
  it('T07 — shows the short message text', () => {
    render(<AIInsightBadge insight={makeInsight({ message: 'Possível atenção contábil' })} />);
    expect(screen.getByText('Possível atenção contábil')).toBeInTheDocument();
  });

  // ── T08: Reason is hidden by default, visible after expand ──
  it('T08 — reason is hidden by default and visible after expanding', async () => {
    render(<AIInsightBadge insight={makeInsight()} />);
    // Reason should not be visible initially
    expect(screen.queryByText('Despesa pessoal em conta PJ')).not.toBeInTheDocument();

    // Click expand button
    const expandBtn = screen.getByTestId('ai-insight-expand');
    fireEvent.click(expandBtn);

    // Reason should now be visible
    expect(screen.getByText('Despesa pessoal em conta PJ')).toBeInTheDocument();
  });

  // ── T09: "Ignorar alerta" button calls onDismiss callback ──
  it('T09 — "Ignorar alerta" button calls onDismiss with insight id', async () => {
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    render(
      <AIInsightBadge insight={makeInsight()} canDismiss={true} onDismiss={onDismiss} />
    );

    const dismissBtn = screen.getByRole('button', { name: /ignorar/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledWith('insight-001');
    });
  });

  // ── T10: Loading disables dismiss button ──
  it('T10 — loading state disables dismiss button', async () => {
    let resolvePromise: () => void;
    const onDismiss = vi.fn().mockReturnValue(new Promise<void>((resolve) => {
      resolvePromise = resolve;
    }));

    render(
      <AIInsightBadge insight={makeInsight()} canDismiss={true} onDismiss={onDismiss} />
    );

    const dismissBtn = screen.getByRole('button', { name: /ignorar/i });
    fireEvent.click(dismissBtn);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(dismissBtn).toBeDisabled();
    });

    // Resolve and wait for state update
    await act(async () => {
      resolvePromise!();
    });
  });

  // ── T11: Failure shows fallback message ──
  it('T11 — failure shows fallback error message', async () => {
    const onDismiss = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <AIInsightBadge insight={makeInsight()} canDismiss={true} onDismiss={onDismiss} />
    );

    const dismissBtn = screen.getByRole('button', { name: /ignorar/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.getByText(/não foi possível ignorar/i)).toBeInTheDocument();
    });
  });

  // ── T12: HTML/script in message renders as text, not HTML ──
  it('T12 — HTML in message is rendered as text, not HTML', () => {
    render(
      <AIInsightBadge
        insight={makeInsight({
          message: '<script>alert("xss")</script>',
          reason: '<img src=x onerror=alert(1)>',
        })}
      />
    );

    // Should appear as text, not execute
    expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();

    // Expand to check reason
    const expandBtn = screen.getByTestId('ai-insight-expand');
    fireEvent.click(expandBtn);

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  // ── T13: canDismiss=false hides dismiss button ──
  it('T13 — canDismiss=false hides the dismiss button', () => {
    render(<AIInsightBadge insight={makeInsight()} canDismiss={false} />);
    expect(screen.queryByRole('button', { name: /ignorar/i })).not.toBeInTheDocument();
  });

  // ── T14: canDismiss defaults to false (no button without prop) ──
  it('T14 — dismiss button is hidden when canDismiss is not provided', () => {
    render(<AIInsightBadge insight={makeInsight()} />);
    expect(screen.queryByRole('button', { name: /ignorar/i })).not.toBeInTheDocument();
  });
});
