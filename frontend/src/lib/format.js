export const inr = (n) => '\u20B9' + Number(n || 0).toLocaleString('en-IN');

export const fmtDate = (s, opts) =>
  new Date(s).toLocaleDateString(
    'en-IN',
    opts || { day: 'numeric', month: 'short', year: 'numeric' },
  );

export const fmtTime = (s) =>
  new Date(`2000-01-01T${s}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const pct = (n) => `${n}%`;
