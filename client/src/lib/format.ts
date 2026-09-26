import { format as fmtDate, formatDistanceToNowStrict, isValid } from 'date-fns';

const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const currencyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const currencyPreciseFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export const formatNumber = (n: number | null | undefined) => numberFmt.format(n ?? 0);
export const formatCompact = (n: number | null | undefined) => compactFmt.format(n ?? 0);

/** ₹3,000 — whole rupees unless the value has paise. */
export const formatCurrency = (n: number | null | undefined) => {
  const v = n ?? 0;
  return (Number.isInteger(v) ? currencyFmt : currencyPreciseFmt).format(v);
};

/** Signed quantity for ledgers: +50 / −10 (true minus sign, never colour alone). */
export const formatSigned = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${numberFmt.format(Math.abs(n))}`;

const toDate = (d: string | Date | null | undefined) => {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return isValid(date) ? date : null;
};

/** dd/MM/yyyy */
export const formatDate = (d: string | Date | null | undefined) => {
  const date = toDate(d);
  return date ? fmtDate(date, 'dd/MM/yyyy') : '—';
};

/** dd/MM/yyyy, HH:mm */
export const formatDateTime = (d: string | Date | null | undefined) => {
  const date = toDate(d);
  return date ? fmtDate(date, 'dd/MM/yyyy, HH:mm') : '—';
};

export const formatRelative = (d: string | Date | null | undefined) => {
  const date = toDate(d);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : '—';
};

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
