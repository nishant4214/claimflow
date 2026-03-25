import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { exportClaimsToExcel } from '@/utils/claimExport';

export default function ExportButton({ data, filename = 'export', variant = "outline", useClaimFormat = false }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Use claim format for claim exports
    if (useClaimFormat || (data[0] && data[0].claim_number !== undefined)) {
      exportClaimsToExcel(data, filename);
      toast.success('Export completed successfully');
      return;
    }

    // Generic CSV fallback
    const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
    const excludeFields = ['id', 'document_urls', 'created_by'];
    const headers = allKeys.filter(key => !excludeFields.includes(key));
    const csvHeader = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',');
    });
    const csv = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export completed successfully');
  };

  return (
    <Button 
      variant={variant} 
      size="sm" 
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export
    </Button>
  );
}