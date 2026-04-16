const eurFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
});

export const fmt = (n) => eurFormatter.format(n ?? 0);
