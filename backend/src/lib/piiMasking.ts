export interface MaskingOptions {
  knownNames?: string[];
}

const CPF_TOKEN = '[CPF_MASKED]';
const CNPJ_TOKEN = '[CNPJ_MASKED]';
const EMAIL_TOKEN = '[EMAIL_MASKED]';
const PHONE_TOKEN = '[PHONE_MASKED]';
const NAME_TOKEN = '[NAME_MASKED]';

export function maskCpf(input: string): string {
  if (input === CPF_TOKEN) return input;
  let text = input.replace(/(?<![\p{L}\p{N}_])\d{3}\.\d{3}\.\d{3}-\d{2}(?![\p{L}\p{N}_])/gu, CPF_TOKEN);
  text = text.replace(/(?<![\p{L}\p{N}_])\d{11}(?![\p{L}\p{N}_])/gu, CPF_TOKEN);
  return text;
}

export function maskCnpj(input: string): string {
  if (input === CNPJ_TOKEN) return input;
  let text = input.replace(/(?<![\p{L}\p{N}_])\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}(?![\p{L}\p{N}_])/gu, CNPJ_TOKEN);
  text = text.replace(/(?<![\p{L}\p{N}_])\d{14}(?![\p{L}\p{N}_])/gu, CNPJ_TOKEN);
  return text;
}

export function maskEmail(input: string): string {
  if (input === EMAIL_TOKEN) return input;
  return input.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, EMAIL_TOKEN);
}

export function maskPhone(input: string): string {
  if (input === PHONE_TOKEN) return input;
  let text = input.replace(/(?<![\p{L}\p{N}_])(?:\+55\s)?(?:\(\d{2}\)\s|\d{2}\s)?\d{4,5}-\d{4}(?![\p{L}\p{N}_])/gu, PHONE_TOKEN);
  text = text.replace(/(?<![\p{L}\p{N}_])[1-9]{2}9\d{8}(?![\p{L}\p{N}_])/gu, PHONE_TOKEN);
  return text;
}

export function maskPixKey(input: string): string {
  if ([CPF_TOKEN, CNPJ_TOKEN, EMAIL_TOKEN, PHONE_TOKEN].includes(input)) return input;

  let masked = maskCnpj(input);
  if (masked !== input) return masked;

  masked = maskEmail(input);
  if (masked !== input) return masked;

  masked = maskPhone(input);
  if (masked !== input) return masked;

  masked = maskCpf(input);
  return masked;
}

export function maskKnownNames(input: string, names: string[]): string {
  let text = input;
  for (const name of names) {
    if (!name) continue;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\b${escapedName}\\b`, 'gi'), NAME_TOKEN);
  }
  return text;
}

export function maskFinancialText(input: string, options?: MaskingOptions): string {
  let text = input;

  // Apply CNPJ before CPF to avoid 14 digit number being partially masked by 11 digit rule
  text = maskCnpj(text);

  // Apply phone formatted before CPF
  text = maskPhone(text);

  text = maskCpf(text);

  text = maskEmail(text);

  if (options?.knownNames && options.knownNames.length > 0) {
    text = maskKnownNames(text, options.knownNames);
  }

  return text;
}
