import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Generate Excel export following the reimbursement claim template format
 * Template structure:
 * Row 0: Tour ID, Department
 * Row 1: Name of claimant, Accompanied With
 * Row 2: HOD, Start Date
 * Row 3: (empty), End Date
 * Row 4: Headers for expense details
 * Rows 5+: Expense data
 */

export function exportClaimsToExcel(claims, claimDetails = {}) {
  const {
    tourId = '',
    claimantName = '',
    hod = '',
    department = '',
    accompaniedWith = '',
    startDate = '',
    endDate = ''
  } = claimDetails;

  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet([]);
  const wb = XLSX.utils.book_new();

  // Row 0: Tour ID and Department
  XLSX.utils.sheet_add_aoa(ws, [['Tour Id :', tourId, '', 'Department', department]], { origin: 'A1' });

  // Row 1: Name and Accompanied With
  XLSX.utils.sheet_add_aoa(ws, [['Name of claimant', claimantName, '', 'Accompanied With :', accompaniedWith]], { origin: 'A2' });

  // Row 2: HOD and Start Date
  XLSX.utils.sheet_add_aoa(ws, [['HOD', hod, '', 'Start Date of claim', startDate]], { origin: 'A3' });

  // Row 3: End Date
  XLSX.utils.sheet_add_aoa(ws, [['', '', '', 'End Date of claim', endDate]], { origin: 'A4' });

  // Row 4: Headers
  XLSX.utils.sheet_add_aoa(ws, [[
    'Expense Date',
    'Particulars',
    'Category - Select from dropdown',
    'Transport Amount',
    'Food Amount',
    'Stay Amount',
    'Other Amount',
    'Claim amount (Rs.)',
    'Remarks (if any)'
  ]], { origin: 'A5' });

  // Rows 5+: Data
  const dataRows = claims.map(claim => [
    claim.expense_date ? format(new Date(claim.expense_date), 'dd/MM/yyyy') : '',
    claim.description || claim.purpose || '',
    claim.category_name || '',
    claim.transport_amount || '',
    claim.food_amount || '',
    claim.stay_amount || '',
    claim.other_amount || '',
    claim.amount || '',
    claim.remarks || ''
  ]);

  if (dataRows.length > 0) {
    XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A6' });
  }

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Expense Date
    { wch: 25 }, // Particulars
    { wch: 25 }, // Category
    { wch: 18 }, // Transport
    { wch: 14 }, // Food
    { wch: 14 }, // Stay
    { wch: 14 }, // Other
    { wch: 18 }, // Claim amount
    { wch: 20 }  // Remarks
  ];

  // Add styling for headers (row 4)
  const headerRow = 5; // 0-indexed, so row 5 is row 4 (1-indexed)
  const headerCells = ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5'];
  headerCells.forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Claims');

  // Generate filename
  const filename = `claims-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export user list to Excel format
 */
export function exportUsersToExcel(users) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Full Name', 'Email', 'Department', 'Designation', 'Portal Role', 'System Access', 'Manager', 'Created Date'],
    ...users.map(u => [
      u.full_name || '—',
      u.email || '—',
      u.department || '—',
      u.designation || '—',
      u.portal_role || 'employee',
      u.role || 'user',
      u.manager_id ? '(Assigned)' : '—',
      u.created_date ? format(new Date(u.created_date), 'dd MMM yyyy') : '—'
    ])
  ]);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');

  const filename = `users-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export generic data to Excel
 */
export function exportToExcel(data, sheetName = 'Data', filename = `export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`) {
  const headers = Object.keys(data[0] || {});
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ...data.map(row => headers.map(h => row[h] || ''))
  ]);

  ws['!cols'] = headers.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}