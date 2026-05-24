import { describe, expect, it } from 'vitest';
import {
  maskCpf,
  maskCnpj,
  maskEmail,
  maskPhone,
  maskPixKey,
  maskKnownNames,
  maskFinancialText,
} from '../../src/lib/piiMasking';

describe('piiMasking', () => {
  describe('maskCpf', () => {
    it('masks formatted CPF', () => {
      expect(maskCpf('123.456.789-09')).toBe('[CPF_MASKED]');
    });

    it('masks unformatted CPF', () => {
      expect(maskCpf('12345678909')).toBe('[CPF_MASKED]');
    });

    it('is idempotent for already masked CPF', () => {
      expect(maskCpf('[CPF_MASKED]')).toBe('[CPF_MASKED]');
    });

    it('does not mask CPF embedded in alphanumeric identifier', () => {
      expect(maskCpf('NFABC12345678909XYZ')).toBe('NFABC12345678909XYZ');
      expect(maskCpf('COD12345678909')).toBe('COD12345678909');
      expect(maskCpf('12345678909XYZ')).toBe('12345678909XYZ');
      expect(maskCpf('ABC12345678909')).toBe('ABC12345678909');
    });

    it('does not mask CPF embedded in alphanumeric identifier with underscore and Unicode', () => {
      expect(maskCpf('NF_12345678909_REF')).toBe('NF_12345678909_REF');
      expect(maskCpf('REFÇ12345678909FIM')).toBe('REFÇ12345678909FIM');
      expect(maskCpf('REF12345678909ÇAO')).toBe('REF12345678909ÇAO');
    });
  });

  describe('maskCnpj', () => {
    it('masks formatted CNPJ', () => {
      expect(maskCnpj('12.345.678/0001-99')).toBe('[CNPJ_MASKED]');
    });

    it('masks unformatted CNPJ', () => {
      expect(maskCnpj('12345678000199')).toBe('[CNPJ_MASKED]');
    });

    it('is idempotent for already masked CNPJ', () => {
      expect(maskCnpj('[CNPJ_MASKED]')).toBe('[CNPJ_MASKED]');
    });

    it('does not mask CNPJ embedded in alphanumeric identifier', () => {
      expect(maskCnpj('DOC12345678000199REF')).toBe('DOC12345678000199REF');
    });

    it('does not mask CNPJ embedded in alphanumeric identifier with underscore', () => {
      expect(maskCnpj('DOC_12345678000199_REF')).toBe('DOC_12345678000199_REF');
    });
  });

  describe('maskEmail', () => {
    it('masks valid email addresses', () => {
      expect(maskEmail('cliente@email.com')).toBe('[EMAIL_MASKED]');
    });

    it('is idempotent for already masked email', () => {
      expect(maskEmail('[EMAIL_MASKED]')).toBe('[EMAIL_MASKED]');
    });
  });

  describe('maskPhone', () => {
    it('masks brazilian phone with DDD and formatting', () => {
      expect(maskPhone('(11) 99999-9999')).toBe('[PHONE_MASKED]');
    });

    it('masks brazilian phone without formatting', () => {
      expect(maskPhone('11999999999')).toBe('[PHONE_MASKED]');
    });

    it('masks brazilian phone with country code', () => {
      expect(maskPhone('+55 11 99999-9999')).toBe('[PHONE_MASKED]');
    });

    it('does not mask dates as phone numbers', () => {
      expect(maskPhone('12/12/2026')).toBe('12/12/2026');
      expect(maskPhone('2026-12-12')).toBe('2026-12-12');
    });

    it('does not mask monetary values as phone numbers', () => {
      expect(maskPhone('1500,00')).toBe('1500,00');
      expect(maskPhone('1.500,00')).toBe('1.500,00');
    });

    it('is idempotent for already masked phone', () => {
      expect(maskPhone('[PHONE_MASKED]')).toBe('[PHONE_MASKED]');
    });

    it('does not mask phone embedded in alphanumeric identifier', () => {
      expect(maskPhone('TELABC11999999999XYZ')).toBe('TELABC11999999999XYZ');
    });

    it('does not mask phone embedded in alphanumeric identifier with underscore', () => {
      expect(maskPhone('TEL_11999999999_REF')).toBe('TEL_11999999999_REF');
    });
  });

  describe('maskPixKey', () => {
    it('masks PIX that looks like CPF', () => {
      expect(maskPixKey('123.456.789-09')).toBe('[CPF_MASKED]');
    });

    it('masks PIX that looks like CNPJ', () => {
      expect(maskPixKey('12.345.678/0001-99')).toBe('[CNPJ_MASKED]');
    });

    it('masks PIX that looks like email', () => {
      expect(maskPixKey('cliente@email.com')).toBe('[EMAIL_MASKED]');
    });

    it('masks PIX that looks like phone', () => {
      expect(maskPixKey('+55 11 99999-9999')).toBe('[PHONE_MASKED]');
    });

    it('is idempotent for already masked PIX keys', () => {
      expect(maskPixKey('[CPF_MASKED]')).toBe('[CPF_MASKED]');
      expect(maskPixKey('[CNPJ_MASKED]')).toBe('[CNPJ_MASKED]');
      expect(maskPixKey('[EMAIL_MASKED]')).toBe('[EMAIL_MASKED]');
      expect(maskPixKey('[PHONE_MASKED]')).toBe('[PHONE_MASKED]');
    });
  });

  describe('maskKnownNames', () => {
    it('masks simple name', () => {
      expect(maskKnownNames('Pagamento para João', ['João'])).toBe('Pagamento para [NAME_MASKED]');
    });

    it('masks compound name', () => {
      expect(maskKnownNames('Pagamento para João Silva', ['João Silva'])).toBe('Pagamento para [NAME_MASKED]');
    });

    it('does not mask unlisted names', () => {
      expect(maskKnownNames('Pagamento para João Silva', ['Maria'])).toBe('Pagamento para João Silva');
    });

    it('does not mask substring within another word', () => {
      expect(maskKnownNames('Pagamento Mariana', ['Maria'])).toBe('Pagamento Mariana');
    });
  });

  describe('maskFinancialText', () => {
    it('masks CPF, CNPJ, email, phone and known name in financial text', () => {
      const input = 'Pix 123.456.789-09 enviado para cliente@email.com. Tel: (11) 99999-9999. Emitente: 12.345.678/0001-99, Nome: João Silva';
      const expected = 'Pix [CPF_MASKED] enviado para [EMAIL_MASKED]. Tel: [PHONE_MASKED]. Emitente: [CNPJ_MASKED], Nome: [NAME_MASKED]';

      expect(maskFinancialText(input, { knownNames: ['João Silva'] })).toBe(expected);
    });

    it('preserves monetary values, categories and sense', () => {
      const input = 'Pagamento aluguel R$ 1.500,00';
      expect(maskFinancialText(input)).toBe(input);
    });

    it('does not mask common dates', () => {
      const input = 'Vencimento 10/12/2026';
      expect(maskFinancialText(input)).toBe(input);
    });

    it('does not destroy generic descriptions or accounting codes', () => {
      const input = 'Ref. NF 123456 cod 6100';
      expect(maskFinancialText(input)).toBe(input);
    });

    it('does not duplicate tokens on double execution', () => {
      const input = 'Pix 123.456.789-09';
      const firstPass = maskFinancialText(input);
      const secondPass = maskFinancialText(firstPass);
      expect(secondPass).toBe('Pix [CPF_MASKED]');
    });

    it('leaves text without PII completely intact', () => {
      const input = 'Transferencia entre contas correntes';
      expect(maskFinancialText(input)).toBe(input);
    });

    it('preserves alphanumeric identifiers containing numbers', () => {
      expect(maskFinancialText('NFABC12345678909XYZ')).toBe('NFABC12345678909XYZ');
    });

    it('preserves generic identifier with underscore and financial value', () => {
      const input = 'Referência NF_12345678909_REF pagamento aluguel R$ 1.500,00';
      expect(maskFinancialText(input)).toBe(input);
    });
  });
});
