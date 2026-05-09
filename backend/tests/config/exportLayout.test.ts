import { describe, expect, it } from 'vitest';
import { getExportLayoutById } from '../../src/config/exportLayouts';
import { validateExportLayout } from '../../src/schemas/exportLayoutSchema';

const expectedDominioLayout = {
  id: 'dominio-separated-v1',
  targetSystem: 'DOMINIO',
  type: 'delimited',
  delimiter: '|',
  encoding: 'windows-1252',
  lineEnding: 'CRLF',
  bom: false,
  finalBlankLine: true,
  records: ['0000', '6000', '6100'],
};

function validLayout(overrides: Record<string, unknown> = {}) {
  return {
    ...expectedDominioLayout,
    records: [...expectedDominioLayout.records],
    ...overrides,
  };
}

describe('export layout config', () => {
  it('carrega layout por id', () => {
    expect(getExportLayoutById('dominio-separated-v1')).toEqual(expectedDominioLayout);
  });

  it('garante contrato completo do dominio-separated-v1', () => {
    const layout = getExportLayoutById('dominio-separated-v1');

    expect(layout).toStrictEqual(expectedDominioLayout);
  });

  it('rejeita layout sem delimiter', () => {
    const layout = validLayout();
    delete layout.delimiter;

    expect(() => validateExportLayout(layout)).toThrow();
  });

  it('rejeita layout sem encoding', () => {
    const layout = validLayout();
    delete layout.encoding;

    expect(() => validateExportLayout(layout)).toThrow();
  });

  it('rejeita layout sem lineEnding', () => {
    const layout = validLayout();
    delete layout.lineEnding;

    expect(() => validateExportLayout(layout)).toThrow();
  });

  it('rejeita layout sem records', () => {
    const layout = validLayout();
    delete layout.records;

    expect(() => validateExportLayout(layout)).toThrow();
  });

  it('rejeita layout com records vazio', () => {
    expect(() => validateExportLayout(validLayout({ records: [] }))).toThrow();
  });

  it.each(['fixed-width', 'csv'])('rejeita layout com type desconhecido: %s', (type) => {
    expect(() => validateExportLayout(validLayout({ type }))).toThrow();
  });

  it('rejeita layoutId inexistente', () => {
    expect(() => getExportLayoutById('missing-layout')).toThrow(
      'Export layout not found: missing-layout'
    );
  });

  it('rejeita records duplicados', () => {
    expect(() =>
      validateExportLayout(validLayout({ records: ['0000', '6000', '6000'] }))
    ).toThrow();
  });
});
