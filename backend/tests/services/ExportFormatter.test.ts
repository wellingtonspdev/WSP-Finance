import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { ExportFormatter } from '../../src/services/ExportFormatter';

describe('ExportFormatter', () => {
  describe('formatDate', () => {
    it('T1 - Formatter formata data UTC', () => {
      // 2026-04-03T15:00:00.000Z
      const date = new Date('2026-04-03T15:00:00.000Z');
      expect(ExportFormatter.formatDate(date)).toBe('03/04/2026');
    });
  });

  describe('formatAmountImplicitCents', () => {
    it('T2 - Formatter converte valor para centavos implícitos', () => {
      expect(ExportFormatter.formatAmountImplicitCents(new Decimal('123.45'))).toBe('12345');
      expect(ExportFormatter.formatAmountImplicitCents(new Decimal('-123.45'))).toBe('12345');
      expect(ExportFormatter.formatAmountImplicitCents(new Decimal('123.454'))).toBe('12345');
      expect(ExportFormatter.formatAmountImplicitCents(new Decimal('123.455'))).toBe('12346');
      expect(ExportFormatter.formatAmountImplicitCents(new Decimal('0.01'))).toBe('1');
    });
  });

  describe('sanitizeComplement', () => {
    it('T3 - Formatter sanitiza complemento', () => {
      const input = 'Texto com | pipe e 😃 emoji e \u4E2D CJK e \x00 controle. Muito longo '.padEnd(300, 'A');
      const result = ExportFormatter.sanitizeComplement(input);

      expect(result).not.toContain('|');
      expect(result).not.toContain('😃');
      expect(result).not.toContain('\u4E2D');
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('formatCnpj', () => {
    it('T4 - Formatter valida CNPJ', () => {
      expect(ExportFormatter.formatCnpj('CNPJ', '12.345.678/0001-90')).toBe('12345678000190');

      expect(() => ExportFormatter.formatCnpj('CPF', '12.345.678/0001-90')).toThrow('Workspace document must be CNPJ');
      expect(() => ExportFormatter.formatCnpj('CNPJ', null)).toThrow('Workspace CNPJ is missing');
      expect(() => ExportFormatter.formatCnpj('CNPJ', '123')).toThrow('Invalid CNPJ length. Expected 14 digits');
    });
  });
});
