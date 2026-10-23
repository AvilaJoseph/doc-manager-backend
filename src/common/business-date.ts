import { Logger } from '@nestjs/common';

export const DEFAULT_TIME_ZONE = 'America/Bogota';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * El default de ConfigService solo aplica a `undefined`: una variable definida
 * pero vacía ("") o mal escrita haría que Intl.DateTimeFormat lance RangeError
 * en cada petición. Se valida una sola vez al arrancar.
 */
export function resolveTimeZone(
  value: string | undefined,
  logger: Logger,
): string {
  if (value === undefined) return DEFAULT_TIME_ZONE;

  const timeZone = value.trim();
  if (!timeZone) {
    logger.warn(
      `APP_TIMEZONE está definida pero vacía; se usa ${DEFAULT_TIME_ZONE}`,
    );
    return DEFAULT_TIME_ZONE;
  }

  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return timeZone;
  } catch {
    logger.warn(
      `APP_TIMEZONE="${timeZone}" no es una zona horaria IANA válida; se usa ${DEFAULT_TIME_ZONE}`,
    );
    return DEFAULT_TIME_ZONE;
  }
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del negocio, no la del servidor. */
export function todayDateString(timeZone: string): string {
  // 'en-CA' formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Días de calendario entre dos fechas YYYY-MM-DD (to - from). */
export function diffInDays(to: string, from: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}
