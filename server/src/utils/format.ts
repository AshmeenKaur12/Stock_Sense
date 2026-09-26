const pad = (n: number) => String(n).padStart(2, '0');

/** Server-side formatting matching the client (dd/MM/yyyy, ₹ en-IN). */
export const format = {
  date: (d: Date | string | null | undefined) => {
    if (!d) return '';
    const x = new Date(d);
    return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`;
  },
  dateTime: (d: Date | string | null | undefined) => {
    if (!d) return '';
    const x = new Date(d);
    return `${format.date(x)} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
  },
  number: (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n),
  /** PDF fonts lack the ₹ glyph, so use "Rs." there. */
  rupees: (n: number) => `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`,
};
