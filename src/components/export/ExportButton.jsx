import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ExportButton({ data, filename = 'export', variant = "outline" }) {
  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Get all unique keys from all objects
    const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
    
    // Filter out unnecessary fields
    const excludeFields = ['id', 'document_urls', 'created_by'];
    const headers = allKeys.filter(key => !excludeFields.includes(key));

    // Create CSV header
    const csvHeader = headers.join(',');

    // Create CSV rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        
        // Handle different data types
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
        
        // Escape commas and quotes
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',');
    });

    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join('\n');

    // Create blob and download
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
      onClick={exportToCSV}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export
    </Button>
  );
}