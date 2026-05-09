import { describe, it, expect } from 'vitest';
import {
  encodeWindows1252,
  normalizeCrlf,
  ensureNoBom,
  sha256,
} from '../../src/lib/encoding';

describe('encoding', () => {
  describe('encodeWindows1252', () => {
    it('encodeWindows1252("Ação") retorna hex 41e7e36f', () => {
      const result = encodeWindows1252('Ação');
      expect(result.toString('hex')).toBe('41e7e36f');
    });

    it('encodeWindows1252("Café\\r\\nPão") retorna hex 436166e90d0a50e36f', () => {
      const result = encodeWindows1252('Café\r\nPão');
      expect(result.toString('hex')).toBe('436166e90d0a50e36f');
    });

    it('encodeWindows1252("Café\\nPão") retorna hex 436166e90d0a50e36f', () => {
      const result = encodeWindows1252('Café\nPão');
      expect(result.toString('hex')).toBe('436166e90d0a50e36f');
    });

    it('encodeWindows1252("A|B") mantém pipe e retorna hex 417c42', () => {
      const result = encodeWindows1252('A|B');
      expect(result.toString('hex')).toBe('417c42');
    });

    it('garante que o Buffer retornado por encodeWindows1252() passa em ensureNoBom()', () => {
      expect(() => ensureNoBom(encodeWindows1252('Café'))).not.toThrow();
    });
  });

  describe('normalizeCrlf', () => {
    it('normalizeCrlf("Café\\rPão") retorna "Café\\r\\nPão"', () => {
      expect(normalizeCrlf('Café\rPão')).toBe('Café\r\nPão');
    });

    it('normalizeCrlf é idempotente', () => {
      const first = normalizeCrlf('Café\nPão');
      const second = normalizeCrlf(first);
      expect(first).toBe('Café\r\nPão');
      expect(second).toBe('Café\r\nPão');
    });
  });

  describe('ensureNoBom', () => {
    it('Buffer gerado normalmente não começa com BOM', () => {
      const buffer = Buffer.from([0x41, 0x42]);
      expect(() => ensureNoBom(buffer)).not.toThrow();
    });

    it('ensureNoBom(Buffer.from([0xef, 0xbb, 0xbf, 0x41])) falha', () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x41]);
      expect(() => ensureNoBom(buffer)).toThrow();
    });

    it('ensureNoBom(Buffer.from([0xff, 0xfe, 0x41])) falha', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x41]);
      expect(() => ensureNoBom(buffer)).toThrow();
    });

    it('ensureNoBom(Buffer.from([0xfe, 0xff, 0x41])) falha', () => {
      const buffer = Buffer.from([0xfe, 0xff, 0x41]);
      expect(() => ensureNoBom(buffer)).toThrow();
    });
  });

  describe('sha256', () => {
    it('sha256(Buffer.from([0x41, 0xe7, 0xe3, 0x6f])) retorna 55b71ab2883a16bd2a610c0ffa952a8f10858ef867eb45c8b1f0183c37b7c9b6', () => {
      const buffer = Buffer.from([0x41, 0xe7, 0xe3, 0x6f]);
      expect(sha256(buffer)).toBe('55b71ab2883a16bd2a610c0ffa952a8f10858ef867eb45c8b1f0183c37b7c9b6');
    });

    it('Hash de Buffer diferente, por exemplo 41e7e36f21, retorna hash diferente', () => {
      const buffer1 = Buffer.from([0x41, 0xe7, 0xe3, 0x6f]);
      const buffer2 = Buffer.from([0x41, 0xe7, 0xe3, 0x6f, 0x21]);
      expect(sha256(buffer1)).not.toBe(sha256(buffer2));
    });
  });
});
