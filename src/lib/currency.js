// Centralized currency utility — used across all roles, modules, and displays

export const CURRENCY_MAP = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

/** Returns the symbol for a currency code, e.g. 'INR' → '₹' */
export function getCurrencySymbol(currency) {
  return CURRENCY_MAP[(currency || 'INR').toUpperCase()] || currency || '₹';
}

/** Format an amount with its currency symbol */
export function formatAmount(amount, currency = 'INR') {
  const sym = getCurrencySymbol(currency);
  const num = parseFloat(amount) || 0;
  return `${sym}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Detect currency from raw OCR text or currency string.
 * Supports symbols (₹, $, €, £) and codes (INR, USD, EUR, GBP, AED…)
 */
export function detectCurrency(text) {
  if (!text) return 'INR';
  const t = String(text).toUpperCase();

  if (t.includes('₹') || t.includes('INR') || t.includes('RS.') || t.includes('RS ')) return 'INR';
  if (t.includes('USD') || (t.includes('$') && !t.includes('S$') && !t.includes('A$') && !t.includes('C$'))) return 'USD';
  if (t.includes('EUR') || t.includes('€')) return 'EUR';
  if (t.includes('GBP') || t.includes('£')) return 'GBP';
  if (t.includes('AED') || t.includes('دإ')) return 'AED';
  if (t.includes('S$') || t.includes('SGD')) return 'SGD';
  if (t.includes('A$') || t.includes('AUD')) return 'AUD';
  if (t.includes('C$') || t.includes('CAD')) return 'CAD';
  if (t.includes('JPY') || t.includes('¥')) return 'JPY';

  return 'INR'; // default
}

/**
 * Given an array of bill documents, return per-currency totals.
 * Example: { INR: 1500, USD: 50 }
 */
export function groupByCurrency(documents = []) {
  const groups = {};
  documents.forEach(doc => {
    const currency = doc.extractedData?.currency || doc.formData?.currency || 'INR';
    const amount = parseFloat(doc.extractedData?.totalAmount) || parseFloat(doc.formData?.amount) || 0;
    if (amount > 0) {
      groups[currency] = (groups[currency] || 0) + amount;
    }
  });
  return groups;
}

/**
 * Compute per-currency totals across all claim entries.
 * Returns array like [{ currency: 'INR', total: 1500 }, { currency: 'USD', total: 50 }]
 */
export function computeClaimTotals(entries = []) {
  const groups = {};
  entries.forEach(entry => {
    const docs = (entry.documents || []).filter(d => d.uploadType === 'bill' && d.status === 'done');
    if (docs.length > 0) {
      docs.forEach(doc => {
        const currency = doc.extractedData?.currency || 'INR';
        const amount = parseFloat(doc.extractedData?.totalAmount) || 0;
        if (amount > 0) groups[currency] = (groups[currency] || 0) + amount;
      });
    } else {
      // Fallback to form data (assume INR if no currency info)
      const amt = parseFloat(entry.formData?.amount) || 0;
      if (amt > 0) groups['INR'] = (groups['INR'] || 0) + amt;
    }
  });
  return Object.entries(groups).map(([currency, total]) => ({ currency, total }));
}