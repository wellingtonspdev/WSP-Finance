import { getExportLayoutById } from '../config/exportLayouts';
import { ExportLayout } from '../schemas/exportLayoutSchema';
import { normalizeCrlf } from '../lib/encoding';

export class ExportLayoutEngine {
  private layout: ExportLayout;
  private lines: string[] = [];
  private recordCount: number = 0;

  constructor(layoutId: string) {
    this.layout = getExportLayoutById(layoutId);
  }

  addRecord0000(cleanCnpj: string, companyCode: string) {
    this.lines.push(`0000${this.layout.delimiter}${cleanCnpj}${this.layout.delimiter}${companyCode}${this.layout.delimiter}`);
    this.recordCount++;
  }

  addRecord6000() {
    this.lines.push(`6000${this.layout.delimiter}X${this.layout.delimiter}1${this.layout.delimiter}${this.layout.delimiter}`);
    this.recordCount++;
  }

  addRecord6100(
    date: string,
    debitAccountCode: string,
    creditAccountCode: string,
    amountImplicitCents: string,
    historyCode: string | null | undefined,
    complement: string,
    sourceLabel: string,
    branchCode: string | null | undefined
  ) {
    const safeHistoryCode = historyCode ?? '';
    const safeBranchCode = branchCode ?? '';

    this.lines.push(
      `6100${this.layout.delimiter}${date}${this.layout.delimiter}${debitAccountCode}${this.layout.delimiter}${creditAccountCode}${this.layout.delimiter}${amountImplicitCents}${this.layout.delimiter}${safeHistoryCode}${this.layout.delimiter}${complement}${this.layout.delimiter}${sourceLabel}${this.layout.delimiter}${safeBranchCode}${this.layout.delimiter}`
    );
    this.recordCount++;
  }

  generate(): string {
    let result = this.lines.join('\r\n');

    if (this.layout.finalBlankLine && this.lines.length > 0) {
      result += '\r\n';
    }

    return normalizeCrlf(result); // Enforce CRLF overall as standard if Windows encoding is applied later
  }

  getRecordCount(): number {
    return this.recordCount;
  }
}
