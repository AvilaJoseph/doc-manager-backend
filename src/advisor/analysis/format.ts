const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** $4.200.000 — separador de miles siempre (Intl en es-CO no agrupa números de 4 cifras). */
export function cop(amount: number): string {
  const rounded = Math.round(amount);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}$${digits}`;
}

/** 0.3364 -> "33,6%" */
export function pct(ratio: number): string {
  const value = Math.round(ratio * 1000) / 10;
  return `${value.toString().replace('.', ',')}%`;
}

/** "2026-09" -> "septiembre de 2026" */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} de ${year}`;
}

/** "2026-01-01" -> "1 de enero de 2026" */
export function dateLabel(date: string): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}

/** Minúsculas y sin tildes, para comparar texto libre. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** "ABC123 (T-04)" -> "abc123-t-04" */
export function slug(text: string): string {
  return (
    normalize(text)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'vehiculo'
  );
}
