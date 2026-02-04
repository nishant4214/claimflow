import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ExcelTemplateGenerator({ categories }) {
  const generateTemplate = () => {
    const headers = [
      'Employee_Name',
      'Employee_Email',
      'Department',
      'Designation',
      'Expense_Date',
      'Purpose',
      'Bill_Number',
      'Bill_Date',
      'Amount',
      'Payment_Mode',
      'Category',
      'Claim_Type',
      'Description',
      'Approval_Status'
    ];

    const sampleRow = {
      Employee_Name: 'John Doe',
      Employee_Email: 'john.doe@example.com',
      Department: 'Sales',
      Designation: 'Sales Manager',
      Expense_Date: '2026-02-01',
      Purpose: 'Client meeting travel',
      Bill_Number: 'BILL12345',
      Bill_Date: '2026-02-01',
      Amount: 5000,
      Payment_Mode: 'Card',
      Category: 'Travel Expenses - Rail',
      Claim_Type: 'normal',
      Description: 'Train tickets for client visit',
      Approval_Status: 'Approved'
    };

    const ws_data = [headers, Object.values(sampleRow)];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 40 }, { wch: 18 }
    ];

    // Create dropdown validation for columns
    const categoryList = categories.map(c => `${c.category_name} - ${c.title}`).join(',');
    
    // Add data validations (Note: XLSX library has limited support for this)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Claims Template");

    // Add instructions sheet
    const instructionsData = [
      ['Bulk Upload Instructions'],
      [''],
      ['Column', 'Description', 'Required', 'Valid Values'],
      ['Employee_Name', 'Full name of employee', 'Yes', 'Any text'],
      ['Employee_Email', 'Email address', 'Yes', 'Valid email format'],
      ['Department', 'Department name', 'No', 'Any text'],
      ['Designation', 'Job designation', 'No', 'Any text'],
      ['Expense_Date', 'Date of expense', 'Yes', 'YYYY-MM-DD format'],
      ['Purpose', 'Purpose of claim', 'Yes', 'Any text'],
      ['Bill_Number', 'Bill/Invoice number', 'No', 'Any text'],
      ['Bill_Date', 'Date on bill', 'No', 'YYYY-MM-DD format'],
      ['Amount', 'Claim amount in INR', 'Yes', 'Numeric value'],
      ['Payment_Mode', 'Payment method', 'No', 'Cash, Card, UPI, Bank Transfer'],
      ['Category', 'Claim category', 'Yes', 'Select from available categories'],
      ['Claim_Type', 'Type of claim', 'Yes', 'normal OR sales_promotion'],
      ['Description', 'Additional details', 'No', 'Any text'],
      ['Approval_Status', 'Excel approval decision', 'Yes', 'Approved OR Rejected'],
      [''],
      ['Important Notes:'],
      ['1. Only rows with Approval_Status = "Approved" can be submitted to workflow'],
      ['2. Rows with Approval_Status = "Rejected" remain in Draft status'],
      ['3. Sales Promotion claims can only be uploaded by CRO role'],
      ['4. Normal claims from bulk upload are auto-approved and sent to Finance'],
      ['5. All dates must be in YYYY-MM-DD format (e.g., 2026-02-01)'],
      ['6. Amount should be numeric without currency symbols'],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 10 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    // Generate file
    XLSX.writeFile(wb, `Bulk_Upload_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Template downloaded successfully');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Download Excel Template
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Download the pre-formatted Excel template with sample data and instructions. 
            Fill in your claims data and upload it back to create multiple claims at once.
          </p>
          <ul className="text-xs text-gray-600 space-y-1 mb-4">
            <li>• Template includes all required columns and validation rules</li>
            <li>• Sample row provided as reference</li>
            <li>• Detailed instructions included in separate sheet</li>
            <li>• Mark each row as "Approved" or "Rejected" in the Approval_Status column</li>
          </ul>
          <Button 
            onClick={generateTemplate}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>
      </div>
    </div>
  );
}