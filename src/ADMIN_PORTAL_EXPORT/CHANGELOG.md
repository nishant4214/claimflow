# CHANGELOG — Admin Portal Updates

All notable changes to the Admin Portal are documented here in reverse chronological order.

---

## [2026-03-31] — Document Upload & Multi-Currency Enhancements

### 📁 File Upload — Size Limit Increased
- **Changed**: Maximum file upload size increased from **5MB → 20MB**
- **Affected**: `components/claims/ClaimDocumentOCR`
- **Constants updated**:
  ```js
  const MAX_FILE_SIZE_MB = 20;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  ```
- **UI**: Drop zone hint now reads "JPG, PNG, PDF — max 20MB · 1 file per type"

---

### 💱 Multi-Currency Support
- **New utility**: `lib/currency.js` added with the following exports:
  - `detectCurrency(text)` — Detects ISO currency code from OCR text/symbols (₹, $, €, £, etc.)
  - `getCurrencySymbol(code)` — Returns symbol for a given ISO code
  - `formatAmount(amount, currency)` — Formats amount with correct currency symbol
  - `computeClaimTotals(entries)` — Aggregates totals **per currency** across claim entries (does NOT mix currencies)

- **Claim header badge**: Now shows **one badge per detected currency** instead of a single INR total
  ```jsx
  // Before: Total: ₹1,500
  // After:  ₹1,500   $50   (separate badges per currency)
  ```

- **ClaimReviewPanel**:
  - Per-entry amounts now display with correct currency symbol
  - Summary card shows multi-currency totals when multiple currencies detected
  - Grand total section shows per-currency breakdown with a warning banner:
    > ⚠️ This claim contains multiple currencies. Totals are shown separately per currency and will not be combined.

- **OCR prompt updated**: Currency field now explicitly requests ISO code:
  ```
  "currency": "ISO currency code detected from symbols/text (e.g. INR, USD, EUR, GBP)"
  ```

---

### 📄 One-File-at-a-Time Upload Policy
- Only **one bill** and **one receipt** are allowed per claim category at a time
- If a file of the same type already exists, user is prompted to **confirm replacement**
- Old file is removed before the new one is uploaded

---

### 🗑️ Reference ID Cleared on Document Removal
- When a document is deleted, payment fields (mode, reference number, date) are **re-derived** from remaining documents
- If **no documents remain**, all payment fields are **cleared to empty**
- Prevents stale reference IDs from persisting after document deletion

---

### 🔔 Toast Notification Duration Fixes
- All validation `toast()` calls now include explicit `duration` to prevent premature dismissal:
  - Error toasts: `duration: 4000–5000ms`
  - Success toasts: `duration: 4000ms`

---

### 🐛 Bug Fix — Loop Variable Reference in OCR Processing
- **Fixed**: In `ClaimDocumentOCR.processFiles()`, the loop variable `doc` was referenced before being declared
- **Fix applied**: `const doc = newDocs[i]` is now declared at the start of the loop body
- This prevented OCR status updates and form data population from working correctly

---

## Developer Notes

### Updating the Standalone Export

When deploying the standalone (non-Base44) version, ensure the following are reflected:

#### `frontend/src/lib/currency.js` (new file — create this)
```js
const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  AED: 'AED', SGD: 'S$', JPY: '¥', CNY: '¥', CAD: 'CA$', AUD: 'A$'
};

export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatAmount(amount, currency = 'INR') {
  const sym = getCurrencySymbol(currency);
  const formatted = parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  return `${sym}${formatted}`;
}

export function detectCurrency(text) {
  if (!text) return 'INR';
  const t = text.toString().toUpperCase();
  if (t.includes('USD') || t.includes('$')) return 'USD';
  if (t.includes('EUR') || t.includes('€')) return 'EUR';
  if (t.includes('GBP') || t.includes('£')) return 'GBP';
  if (t.includes('AED')) return 'AED';
  if (t.includes('SGD')) return 'SGD';
  if (t.includes('JPY') || t.includes('¥')) return 'JPY';
  if (t.includes('INR') || t.includes('₹')) return 'INR';
  return 'INR'; // default
}

export function computeClaimTotals(entries) {
  const totals = {};
  entries.forEach(entry => {
    const currency = entry.documents?.[0]?.extractedData?.currency || 'INR';
    const amount = parseFloat(entry.formData?.amount) || 0;
    totals[currency] = (totals[currency] || 0) + amount;
  });
  return Object.entries(totals).map(([currency, total]) => ({ currency, total }));
}
```

#### `frontend/src/components/claims/ClaimDocumentOCR.jsx`
- Change `MAX_FILE_SIZE_MB = 5` → `MAX_FILE_SIZE_MB = 20`
- Add `const doc = newDocs[i]` at the start of the upload loop body
- Import `detectCurrency` from `../lib/currency`

#### `frontend/src/pages/NewClaim.jsx`
- Import `computeClaimTotals, formatAmount` from `../lib/currency`
- Replace single total badge with per-currency badge loop using `computeClaimTotals(entries)`
- Add `duration` to all `toast()` calls

#### `frontend/src/components/claims/ClaimReviewPanel.jsx`
- Import `computeClaimTotals, formatAmount` from `../../lib/currency`
- Replace hardcoded `₹` totals with `formatAmount(total, currency)` calls
- Add multi-currency warning banner when `currencyTotals.length > 1`

---

## Previous Versions

No prior changelog entries. This is the first recorded update log.

---

*For full technical architecture, see `ARCHITECTURE.md`*
*For setup instructions, see `SETUP_CHECKLIST.md`*
*For deployment, see `DEPLOYMENT.md`*