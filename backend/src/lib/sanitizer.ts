const DEFAULT_DOMINIO_TEXT_MAX_LEN = 255;

function toSafeString(input: string | null | undefined): string {
  return input ?? '';
}

function normalizeSpaces(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeText(input: string | null | undefined): string {
  return normalizeSpaces(toSafeString(input).normalize('NFC'));
}

export function removeEmojis(input: string | null | undefined): string {
  return toSafeString(input)
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu, '')
    .replace(/\p{Emoji_Modifier}/gu, '')
    .replace(/[\u200D\uFE0F]/gu, '');
}

export function removeUnsupportedUnicode(input: string | null | undefined): string {
  return toSafeString(input).replace(/[^\u0000-\u00FF\u20AC\u2018-\u201A\u201C-\u201E]/gu, '');
}

export function removeControlChars(input: string | null | undefined): string {
  return toSafeString(input).replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
}

export function removeDelimiter(input: string | null | undefined, delimiter = '|'): string {
  const text = toSafeString(input);

  if (delimiter.length === 0) {
    return text;
  }

  return text.replace(new RegExp(escapeRegExp(delimiter), 'g'), ' ');
}

export function truncate(input: string | null | undefined, maxLen: number): string {
  if (maxLen <= 0) {
    return '';
  }

  return Array.from(toSafeString(input)).slice(0, maxLen).join('');
}

export function toDominioText(input: string | null | undefined, maxLen = DEFAULT_DOMINIO_TEXT_MAX_LEN): string {
  if (maxLen <= 0) {
    return '';
  }

  const normalized = normalizeText(input);
  const withoutDelimiter = removeDelimiter(normalized);
  const withoutEmojis = removeEmojis(withoutDelimiter);
  const withoutUnsupportedUnicode = removeUnsupportedUnicode(withoutEmojis);
  const withoutControlChars = removeControlChars(withoutUnsupportedUnicode);
  const normalizedSpaces = normalizeSpaces(withoutControlChars);
  const uppercased = normalizedSpaces.toLocaleUpperCase('pt-BR');

  return truncate(uppercased, maxLen);
}
