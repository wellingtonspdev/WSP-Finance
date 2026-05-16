import { Decimal } from '@prisma/client/runtime/library';
import { toDominioText } from '../lib/sanitizer';

export class ExportFormatter {
  /**
   * Formats a date to dd/mm/yyyy.
   * Extracts UTC date parts to avoid timezone shifting.
   */
  static formatDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Converts a Decimal amount into an implicit cents string without dots or commas.
   * Requires amount > 0. Rounds using HALF_UP.
   */
  static formatAmountImplicitCents(amount: Decimal): string {
    // Multiply by 100, round HALF_UP, and stringify
    // To absolute value just in case
    const absValue = amount.abs();
    const cents = absValue.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return cents.toString();
  }

  /**
   * Sanitizes complement using toDominioText and limits to 255 chars.
   */
  static sanitizeComplement(text: string | null | undefined): string {
    return toDominioText(text, 255);
  }

  /**
   * Validates and formats CNPJ by removing punctuation.
   */
  static formatCnpj(documentType: string | null | undefined, document: string | null | undefined): string {
    if (documentType !== 'CNPJ') {
      throw new Error('Workspace document must be CNPJ');
    }

    if (!document) {
      throw new Error('Workspace CNPJ is missing');
    }

    const cleanCnpj = document.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      throw new Error('Invalid CNPJ length. Expected 14 digits');
    }

    return cleanCnpj;
  }
}
