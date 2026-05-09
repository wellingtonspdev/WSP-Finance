import * as iconv from 'iconv-lite';
import * as crypto from 'node:crypto';

export function normalizeCrlf(content: string): string {
  return content.replace(/\r\n|\r|\n/g, '\r\n');
}

export function encodeWindows1252(content: string): Buffer {
  const normalized = normalizeCrlf(content);
  const buffer = iconv.encode(normalized, 'win1252');

  ensureNoBom(buffer);

  return buffer;
}

export function ensureNoBom(buffer: Buffer): void {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    throw new Error('Buffer contains UTF-8 BOM');
  }
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
      throw new Error('Buffer contains UTF-16 LE BOM');
    }
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      throw new Error('Buffer contains UTF-16 BE BOM');
    }
  }
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
