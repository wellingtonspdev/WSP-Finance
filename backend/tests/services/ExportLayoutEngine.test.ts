import { describe, it, expect } from 'vitest';
import { ExportLayoutEngine } from '../../src/services/ExportLayoutEngine';

describe('ExportLayoutEngine', () => {
  it('T5 - LayoutEngine gera registros 0000/6000/6100', () => {
    const engine = new ExportLayoutEngine('dominio-separated-v1');

    engine.addRecord0000('12345678000190', '999');
    engine.addRecord6000();
    engine.addRecord6100(
      '03/04/2026',
      '111',
      '222',
      '12345',
      '333',
      'COMPLEMENTO TESTE',
      'WSP',
      'FILIAL'
    );

    const result = engine.generate();

    expect(result).toContain('0000|12345678000190|999|');
    expect(result).toContain('6000|X|1||');
    expect(result).toContain('6100|03/04/2026|111|222|12345|333|COMPLEMENTO TESTE|WSP|FILIAL|');
    expect(result).not.toContain('\n\n');
    expect(result).not.toContain('\r\n\r\n');
    expect(result).not.toMatch(/[^\r]\n/); // no LF without CR
  });

  it('T6 - LayoutEngine respeita finalBlankLine strict CRLF', () => {
    const engine = new ExportLayoutEngine('dominio-separated-v1');

    engine.addRecord0000('12345678000190', '999');
    const result = engine.generate();

    // The layout has finalBlankLine = true
    expect(result.endsWith('\r\n')).toBe(true);
    // ensure no double CRLF unless added specifically
    expect(result.endsWith('\r\n\r\n')).toBe(false);
    expect(result).not.toMatch(/[^\r]\n/); // no LF without CR

    expect(engine.getRecordCount()).toBe(1); // 0000 only
  });
});
