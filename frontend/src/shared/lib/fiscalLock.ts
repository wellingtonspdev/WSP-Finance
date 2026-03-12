import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

/**
 * Verifica se uma data de transação pertence a um período fiscal fechado.
 * Usa granularidade de 'day' para garantir que 23:59:59 do dia limite
 * seja corretamente bloqueado (isSameOrBefore, não isBefore).
 * 
 * @returns true se a data estiver bloqueada (dentro do período fechado)
 */
export function isDateLocked(
  transactionDate: Date | string,
  closedUntil: Date | string | null | undefined
): boolean {
  if (!closedUntil) return false;
  return dayjs(transactionDate).isSameOrBefore(dayjs(closedUntil), 'day');
}
