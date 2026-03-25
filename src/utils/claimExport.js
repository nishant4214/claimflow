import * as XLSX from 'xlsx';

/**
 * Export claims to Excel in the official Reimbursement Claim format.
 * Matches the provided format sheet exactly.
 */
export function exportClaimsToExcel(claims, filename = 'Reimbursement_Claim') {
  // If single claim, wrap in array
  const claimList = Array.isArray(claims) ? claims : [claims];

  if (claimList.length === 1) {
    // Single claim: single-sheet format
    const wb = XLSX.utils.book_new();
    const ws = buildClaimSheet(claimList[0]);
    XLSX.utils.book_append_sheet(wb, ws, 'Claim');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    // Multiple claims: one sheet per claim + summary sheet
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Reimbursement Claims Summary'],
      [],
      ['Claim Number', 'Employee Name', 'Department', 'Category', 'Amount (₹)', 'Status', 'Submission Date'],
      ...claimList.map(c => [
        c.claim_number || '',
        c.employee_name || '',
        c.department || '',
        c.category_name || '',
        c.amount || 0,
        c.status || '',
        c.created_date ? new Date(c.created_date).toLocaleDateString('en-IN') : '',
      ]),
      [],
      ['', '', '', 'TOTAL', claimList.reduce((s, c) => s + (c.amount || 0), 0), '', ''],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Individual claim sheets
    claimList.forEach((claim, idx) => {
      const ws = buildClaimSheet(claim);
      const sheetName = (claim.claim_number || `Claim_${idx + 1}`).replace(/[:/\\?*\[\]]/g, '_').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
}

function buildClaimSheet(claim) {
  const bills = claim.bills || [];

  // Determine amounts per category bucket
  const catName = (claim.category_name || '').toLowerCase();
  const isTravel = catName.includes('travel');
  const isFood = catName.includes('food') || catName.includes('lunch') || catName.includes('dinner');
  const isHotel = catName.includes('hotel') || catName.includes('accommodation') || catName.includes('stay');

  const rows = [];

  // ── HEADER SECTION ─────────────────────────────────────────────
  rows.push(['Tour Id :', claim.claim_number || '', '', 'Department', claim.department || '']);
  rows.push(['Name of claimant', claim.employee_name || '', '', 'Accompanied With :', '']);
  rows.push(['HOD', '', '', 'Start Date of claim', claim.expense_date_from || claim.expense_date || '']);
  rows.push(['', '', '', 'End Date of claim', claim.expense_date_to || claim.expense_date || '']);
  rows.push([]); // blank spacer

  // ── TABLE HEADER ───────────────────────────────────────────────
  rows.push([
    'Expense Date',
    'Particulars',
    'Category - Select from dropdown',
    'Transport Amount',
    'Food Amount',
    'Stay Amount',
    'Other Amount',
    'Claim amount (Rs.)',
    'Remarks (if any)',
  ]);

  // ── DATA ROWS ──────────────────────────────────────────────────
  if (bills.length > 0) {
    bills.forEach(bill => {
      const billCat = (claim.category_name || '').toLowerCase();
      const isBillTravel = billCat.includes('travel');
      const isBillFood = billCat.includes('food') || billCat.includes('lunch') || billCat.includes('dinner');
      const isBillHotel = billCat.includes('hotel') || billCat.includes('accommodation') || billCat.includes('stay');

      const transport = isBillTravel ? (bill.amount || 0) : 0;
      const food = isBillFood ? (bill.amount || 0) : 0;
      const stay = isBillHotel ? (bill.amount || 0) : 0;
      const other = (!isBillTravel && !isBillFood && !isBillHotel) ? (bill.amount || 0) : 0;

      rows.push([
        bill.bill_date || '',
        bill.purpose || claim.purpose || '',
        claim.category_name || '',
        transport || '',
        food || '',
        stay || '',
        other || '',
        bill.amount || 0,
        bill.payment_mode || claim.payment_mode || '',
      ]);
    });
  } else {
    // Fallback single row from claim
    const transport = isTravel ? (claim.amount || 0) : 0;
    const food = isFood ? (claim.amount || 0) : 0;
    const stay = isHotel ? (claim.amount || 0) : 0;
    const other = (!isTravel && !isFood && !isHotel) ? (claim.amount || 0) : 0;

    rows.push([
      claim.expense_date_from || claim.expense_date || '',
      claim.purpose || '',
      claim.category_name || '',
      transport || '',
      food || '',
      stay || '',
      other || '',
      claim.amount || 0,
      claim.payment_mode || '',
    ]);
  }

  // ── TOTAL ROW ──────────────────────────────────────────────────
  rows.push([]); // blank
  const totalTransport = bills.filter(b => (claim.category_name || '').toLowerCase().includes('travel')).reduce((s, b) => s + (b.amount || 0), 0);
  const totalFood = bills.filter(b => {
    const c = (claim.category_name || '').toLowerCase();
    return c.includes('food') || c.includes('lunch') || c.includes('dinner');
  }).reduce((s, b) => s + (b.amount || 0), 0);
  const totalStay = bills.filter(b => {
    const c = (claim.category_name || '').toLowerCase();
    return c.includes('hotel') || c.includes('stay');
  }).reduce((s, b) => s + (b.amount || 0), 0);
  const totalOther = (claim.amount || 0) - totalTransport - totalFood - totalStay;
  const grandTotal = claim.amount || 0;

  rows.push([
    '', 'Total', '',
    totalTransport || '',
    totalFood || '',
    totalStay || '',
    Math.max(0, totalOther) || '',
    grandTotal,
    '',
  ]);

  rows.push([]); // blank
  rows.push([]); // blank

  // ── SIGNATURE SECTION ──────────────────────────────────────────
  rows.push(['Submitted By :', '', '', 'HOD Approval :', '', '', 'Admin :', '', 'MD Approval :']);
  rows.push([claim.employee_name || '', '', '', '', '', '', '', '', '']);
  rows.push([]); // blank
  rows.push(['Date :', new Date().toLocaleDateString('en-IN'), '', 'Date :', '', '', 'Date :', '', 'Date :']);

  // ── BUILD WORKSHEET ────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // Expense Date
    { wch: 28 }, // Particulars
    { wch: 26 }, // Category
    { wch: 16 }, // Transport
    { wch: 14 }, // Food
    { wch: 12 }, // Stay
    { wch: 12 }, // Other
    { wch: 18 }, // Claim Amount
    { wch: 20 }, // Remarks
  ];

  return ws;
}