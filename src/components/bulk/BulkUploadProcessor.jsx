import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, addDays } from 'date-fns';

export default function BulkUploadProcessor({ user, categories, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);

  const userRole = user?.portal_role || user?.role;

  const validateRow = (row, index, userRole) => {
    const rowErrors = [];
    const rowNumber = index + 2; // +2 for header and 0-index

    if (!row.Employee_Name?.trim()) rowErrors.push(`Row ${rowNumber}: Employee Name is required`);
    if (!row.Employee_Email?.trim()) rowErrors.push(`Row ${rowNumber}: Employee Email is required`);
    if (!row.Expense_Date) rowErrors.push(`Row ${rowNumber}: Expense Date is required`);
    if (!row.Purpose?.trim()) rowErrors.push(`Row ${rowNumber}: Purpose is required`);
    if (!row.Amount || isNaN(row.Amount) || row.Amount <= 0) {
      rowErrors.push(`Row ${rowNumber}: Valid Amount is required`);
    }
    if (!row.Category?.trim()) rowErrors.push(`Row ${rowNumber}: Category is required`);
    
    const claimType = (row.Claim_Type || 'normal').toLowerCase();
    if (!['normal', 'sales_promotion'].includes(claimType)) {
      rowErrors.push(`Row ${rowNumber}: Claim_Type must be "normal" or "sales_promotion"`);
    }

    // Role-based validation
    if (claimType === 'sales_promotion' && userRole !== 'cro') {
      rowErrors.push(`Row ${rowNumber}: Sales Promotion claims can only be uploaded by CRO role`);
    }

    const approvalStatus = row.Approval_Status?.trim();
    if (!approvalStatus || !['Approved', 'Rejected'].includes(approvalStatus)) {
      rowErrors.push(`Row ${rowNumber}: Approval_Status must be "Approved" or "Rejected"`);
    }

    // Validate category exists
    const category = categories.find(c => 
      `${c.category_name} - ${c.title}` === row.Category
    );
    if (!category) {
      rowErrors.push(`Row ${rowNumber}: Invalid Category "${row.Category}"`);
    }

    return { valid: rowErrors.length === 0, errors: rowErrors, category };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrors([]);
    setPreview(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Validate all rows
      const validationErrors = [];
      const validRows = [];
      const invalidRows = [];

      jsonData.forEach((row, index) => {
        const { valid, errors, category } = validateRow(row, index, userRole);
        
        if (valid) {
          validRows.push({
            ...row,
            category_id: category.id,
            category_name: category.category_name,
            _rowIndex: index + 2
          });
        } else {
          invalidRows.push({ row: index + 2, errors });
          validationErrors.push(...errors);
        }
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        toast.error(`Validation failed: ${validationErrors.length} error(s) found`);
        setUploading(false);
        return;
      }

      // Create preview
      const approvedCount = validRows.filter(r => r.Approval_Status === 'Approved').length;
      const rejectedCount = validRows.filter(r => r.Approval_Status === 'Rejected').length;

      setPreview({
        fileName: file.name,
        totalRows: validRows.length,
        approvedCount,
        rejectedCount,
        rows: validRows
      });

      toast.success(`File validated successfully: ${validRows.length} claims found`);
    } catch (error) {
      toast.error(error.message || 'Failed to process Excel file');
      setErrors([error.message]);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview?.rows) return;

    setUploading(true);

    try {
      const claimsToCreate = preview.rows.map(row => {
        const claimType = (row.Claim_Type || 'normal').toLowerCase();
        
        return {
          employee_name: row.Employee_Name,
          employee_email: row.Employee_Email,
          department: row.Department || '',
          designation: row.Designation || '',
          expense_date: row.Expense_Date,
          purpose: row.Purpose,
          bill_number: row.Bill_Number || '',
          bill_date: row.Bill_Date || '',
          amount: parseFloat(row.Amount),
          payment_mode: row.Payment_Mode || 'Cash',
          category_id: row.category_id,
          category_name: row.category_name,
          claim_type: claimType,
          description: row.Description || '',
          document_urls: [],
          status: 'draft',
          excel_approval_status: row.Approval_Status,
          source: 'Bulk Upload',
          uploaded_by: user.email,
          uploader_role: userRole,
          sla_date: format(addDays(new Date(), 45), 'yyyy-MM-dd'),
        };
      });

      // Bulk create claims
      const createdClaims = await base44.entities.Claim.bulkCreate(claimsToCreate);

      // Log the upload
      await base44.entities.BulkUploadLog.create({
        uploader_email: user.email,
        uploader_role: userRole,
        action_type: 'upload',
        claims_count: preview.totalRows,
        approved_count: preview.approvedCount,
        rejected_count: preview.rejectedCount,
        file_name: preview.fileName,
        claim_ids: createdClaims.map(c => c.id),
        notes: `Uploaded ${preview.totalRows} claims via Excel`
      });

      toast.success(`Successfully created ${createdClaims.length} draft claims`);
      setPreview(null);
      setErrors([]);
      onUploadComplete?.();
    } catch (error) {
      toast.error(error.message || 'Failed to create claims');
      setErrors([error.message]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Excel File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileSpreadsheet className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">Excel file (.xlsx, .xls)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Validation Errors:</div>
              <ul className="list-disc list-inside text-sm space-y-1">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 10 && (
                  <li className="text-gray-600">...and {errors.length - 10} more errors</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-semibold mb-2">File validated successfully!</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Claims: <Badge variant="outline">{preview.totalRows}</Badge></div>
                  <div>File: <span className="text-gray-600">{preview.fileName}</span></div>
                  <div>Approved: <Badge className="bg-green-600">{preview.approvedCount}</Badge></div>
                  <div>Rejected: <Badge className="bg-red-600">{preview.rejectedCount}</Badge></div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm & Create {preview.totalRows} Claims
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}