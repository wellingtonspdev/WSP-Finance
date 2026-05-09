import { describe, expect, it } from 'vitest';
import {
  normalizeText,
  removeControlChars,
  removeDelimiter,
  removeEmojis,
  removeUnsupportedUnicode,
  toDominioText,
  truncate,
} from '../../src/lib/sanitizer';

describe('sanitizer', () => {
  describe('normalizeText', () => {
    it('returns an empty string for null and undefined', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });

    it('normalizes multiple spaces and trims text', () => {
      expect(normalizeText('  A    B   C  ')).toBe('A B C');
    });
  });

  describe('removeDelimiter', () => {
    it('replaces pipe with a space without joining words', () => {
      expect(removeDelimiter('Pagamento|Aluguel')).toBe('Pagamento Aluguel');
    });

    it('supports a custom delimiter', () => {
      expect(removeDelimiter('Conta;Receita;Servico', ';')).toBe('Conta Receita Servico');
    });
  });

  describe('removeEmojis', () => {
    it('removes simple emojis', () => {
      expect(removeEmojis('Pagamento 😊')).toBe('Pagamento ');
    });

    it('removes composed emojis, skin tone modifiers, and flags', () => {
      expect(removeEmojis('Dev 👨‍💻 ok 👍🏽 Brasil 🇧🇷')).toBe('Dev  ok  Brasil ');
    });
  });

  describe('removeUnsupportedUnicode', () => {
    it('removes CJK characters and preserves PT-BR accents', () => {
      expect(removeUnsupportedUnicode('東京 Café ação ótimo útil')).toBe(' Café ação ótimo útil');
    });
  });

  describe('removeControlChars', () => {
    it('replaces line breaks and tabs with spaces', () => {
      expect(removeControlChars('Linha 1\nLinha 2\tFim\r')).toBe('Linha 1 Linha 2 Fim ');
    });

    it('replaces invisible control characters with spaces', () => {
      expect(removeControlChars('A\u0000B\u001FC')).toBe('A B C');
    });
  });

  describe('truncate', () => {
    it('never exceeds maxLen', () => {
      const result = truncate('abcdefghijklmnopqrstuvwxyz', 10);

      expect(result).toBe('abcdefghij');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('returns an empty string when maxLen is zero or negative', () => {
      expect(truncate('abc', 0)).toBe('');
      expect(truncate('abc', -1)).toBe('');
    });

    it('does not add ellipsis when maxLen is less than 3', () => {
      expect(truncate('abcdef', 2)).toBe('ab');
    });
  });

  describe('toDominioText', () => {
    it('normalizes a regular string and applies uppercase', () => {
      expect(toDominioText('Pagamento aluguel', 255)).toBe('PAGAMENTO ALUGUEL');
    });

    it('runs the full pipeline and removes delimiters and emojis', () => {
      expect(toDominioText('Pagamento | Aluguel 😊', 255)).toBe('PAGAMENTO ALUGUEL');
    });

    it('does not leave pipe delimiters in the final result', () => {
      const result = toDominioText('A|B|C', 255);

      expect(result).toBe('A B C');
      expect(result).not.toContain('|');
    });

    it('removes CJK characters and preserves accents before uppercase', () => {
      expect(toDominioText('東京 Café', 255)).toBe('CAFÉ');
    });

    it('preserves common PT-BR characters compatible with Windows-1252', () => {
      expect(toDominioText('ação maçã café avó baú', 255)).toBe('AÇÃO MAÇÃ CAFÉ AVÓ BAÚ');
    });

    it('normalizes line breaks, tabs, invisible controls, and multiple spaces', () => {
      expect(toDominioText(' Linha 1\nLinha 2\t\u0000Fim\u001F  ', 255)).toBe('LINHA 1 LINHA 2 FIM');
    });

    it('replaces invisible C0 control characters with spaces in the final pipeline', () => {
      expect(toDominioText('A\u0000B\u001FC', 255)).toBe('A B C');
    });

    it('replaces C1 control characters with spaces in the final pipeline', () => {
      expect(toDominioText('A\u007FB\u009FC', 255)).toBe('A B C');
    });

    it('returns an empty string for null and undefined', () => {
      expect(toDominioText(null, 255)).toBe('');
      expect(toDominioText(undefined, 255)).toBe('');
    });

    it('returns an empty string when maxLen is zero or negative', () => {
      expect(toDominioText('abc', 0)).toBe('');
      expect(toDominioText('abc', -1)).toBe('');
    });

    it('truncates only at the end of the pipeline', () => {
      expect(toDominioText('abc|def 😊', 7)).toBe('ABC DEF');
    });

    it('respects maxLen values less than 3 without ellipsis', () => {
      expect(toDominioText('abcdef', 2)).toBe('AB');
    });

    it('uses 255 as the default max length', () => {
      const result = toDominioText('a'.repeat(300));

      expect(result.length).toBe(255);
      expect(result).toBe('A'.repeat(255));
    });

    it('is deterministic and does not mutate the original input', () => {
      const input = 'Pagamento | Café 😊';

      expect(toDominioText(input, 255)).toBe('PAGAMENTO CAFÉ');
      expect(toDominioText(input, 255)).toBe('PAGAMENTO CAFÉ');
      expect(input).toBe('Pagamento | Café 😊');
    });
  });
});
