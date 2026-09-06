/**
 * Peso formatting. Every price in this app goes through here — a hand-rolled
 * `₱${n}` loses the thousands separators that make a six-figure order readable
 * at a glance, and that is exactly the number a seller is checking.
 */
const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(amount)) return '₱0.00';
  return peso.format(amount);
}

const wholeNumber = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

export function formatCount(value: number | null | undefined): string {
  return wholeNumber.format(value ?? 0);
}

/**
 * Dates arrive as MySQL datetimes ("2026-09-06 14:03:00"), which Safari and
 * Hermes both refuse to parse — the space is not ISO. Normalising here is why
 * screens can render a date without each one rediscovering the bug.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-PH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
