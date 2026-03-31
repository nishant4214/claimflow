import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload, Trash2, Eye, Sparkles, AlertTriangle,
  Loader2, ShieldAlert, ShieldCheck, FileText, Image,
  RotateCcw, AlertCircle, Info, PenLine, Receipt, CheckCircle2, ExternalLink
} from 'lucide-react';
import { detectCurrency } from '@/lib/currency';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const FLAG_STYLES = {
  LOW_CONFIDENCE:    { label: 'Low Confidence',     color: 'bg-amber-100 text-amber-800 border-amber-300' },
  DUPLICATE:         { label: 'Duplicate Bill',      color: 'bg-red-100 text-red-800 border-red-300' },
  MISMATCH:          { label: 'Data Mismatch',       color: 'bg-orange-100 text-orange-800 border-orange-300' },
  INVALID_STRUCTURE: { label: 'Invalid Bill',         color: 'bg-red-100 text-red-800 border-red-300' },
  POSSIBLE_FAKE:     { label: 'Possible Fake',        color: 'bg-red-100 text-red-800 border-red-300' },
  ANOMALY:           { label: 'Anomaly Detected',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
  HANDWRITTEN:       { label: 'Handwritten Bill',    color: 'bg-blue-100 text-blue-800 border-blue-300' },
  LOW_QUALITY:       { label: 'Low Quality Document', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  EXCEPTION_CASE:    { label: 'Exception Case',      color: 'bg-purple-100 text-purple-800 border-purple-300' },
  CROSS_MISMATCH:    { label: 'Bill-Receipt Mismatch', color: 'bg-red-100 text-red-800 border-red-300' },
};

async function runOCRAndValidation(fileUrl, categoryTitle) {
  const prompt = `You are an expert OCR and expense bill fraud detection system.

Analyze this bill/receipt image carefully and return a JSON object:

{
  "extractedData": {
    "vendorName": "string or null",
    "billNumber": "string or null",
    "billDate": "YYYY-MM-DD or null",
    "billTime": "HH:MM or null",
    "totalAmount": "number or null",
    "taxAmount": "number or null",
    \"currency\": \"ISO currency code detected from symbols/text (e.g. INR, USD, EUR, GBP)\",
    "paymentMode": "Cash/Card/UPI or null",
    "transactionId": "string or null (UTR/UPI ref/txn ID if visible)",
    "location": "string or null",
    "restaurantName": "string or null",
    "mealType": "string or null",
    "checkIn": "YYYY-MM-DD or null",
    "checkOut": "YYYY-MM-DD or null",
    "from": "string or null",
    "to": "string or null",
    "rideId": "string or null",
    "quantity": "number or null",
    "ratePerLiter": "number or null",
    "rawText": "brief summary of visible text"
  },
  "validation": {
    "isValidStructure": true,
    "hasVendorName": true,
    "hasAmount": true,
    "hasDate": true,
    "authenticityScore": 85,
    "confidenceScore": 80,
    "possibleFake": false,
    "isHandwritten": false,
    "isLowQuality": false,
    "fakeReasons": [],
    "flags": []
  }
}

Authenticity: 90-100 authentic, 70-89 likely legit, 50-69 suspicious, 0-49 likely fake.
isHandwritten: true if bill appears handwritten.
isLowQuality: true if image is blurry, damaged or unreadable.
confidenceScore: how confident you are in the extraction.
transactionId: extract ANY transaction reference number visible (UTR, UPI ref, receipt no, authorization code).
flags: any of LOW_CONFIDENCE, INVALID_STRUCTURE, POSSIBLE_FAKE, ANOMALY, HANDWRITTEN, LOW_QUALITY.
Category: ${categoryTitle}. Return ONLY valid JSON.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [fileUrl],
    response_json_schema: {
      type: 'object',
      properties: {
        extractedData: { type: 'object' },
        validation: { type: 'object' }
      }
    }
  });

  const data = result;
  const validation = data.validation || {};
  const flags = [...(validation.flags || [])];

  if ((validation.confidenceScore || 100) < 70 && !flags.includes('LOW_CONFIDENCE')) flags.push('LOW_CONFIDENCE');
  if (!validation.isValidStructure && !flags.includes('INVALID_STRUCTURE')) flags.push('INVALID_STRUCTURE');
  if (validation.possibleFake && !flags.includes('POSSIBLE_FAKE')) flags.push('POSSIBLE_FAKE');
  if (validation.isHandwritten && !flags.includes('HANDWRITTEN')) flags.push('HANDWRITTEN');
  if (validation.isLowQuality && !flags.includes('LOW_QUALITY')) flags.push('LOW_QUALITY');

  return {
    extractedData: data.extractedData || {},
    validation: {
      ...validation,
      flags,
      isHandwritten: validation.isHandwritten || flags.includes('HANDWRITTEN'),
      isLowQuality: validation.isLowQuality || (validation.confidenceScore || 100) < 50,
      isExceptionCase: false,
    }
  };
}

function crossVerify(bill, receipt) {
  if (!bill?.extractedData || !receipt?.extractedData) return null;
  const b = bill.extractedData;
  const r = receipt.extractedData;
  const checks = [];

  // Amount check
  const bAmt = parseFloat(b.totalAmount);
  const rAmt = parseFloat(r.totalAmount);
  if (!isNaN(bAmt) && !isNaN(rAmt)) {
    const diff = Math.abs(bAmt - rAmt);
    const pct = (diff / bAmt) * 100;
    checks.push({ field: 'Amount', bill: `₹${bAmt}`, receipt: `₹${rAmt}`, match: pct < 1 });
  }

  // Date check
  if (b.billDate && r.billDate) {
    checks.push({ field: 'Date', bill: b.billDate, receipt: r.billDate, match: b.billDate === r.billDate });
  }

  // Transaction ID check
  const bTxn = b.transactionId || b.rideId || b.billNumber;
  const rTxn = r.transactionId || r.rideId || r.billNumber;
  if (bTxn && rTxn) {
    checks.push({ field: 'Transaction / Ref ID', bill: bTxn, receipt: rTxn, match: bTxn.toString().toLowerCase().includes(rTxn.toString().toLowerCase()) || rTxn.toString().toLowerCase().includes(bTxn.toString().toLowerCase()) });
  }

  // Time check
  if (b.billTime && r.billTime) {
    checks.push({ field: 'Time', bill: b.billTime, receipt: r.billTime, match: b.billTime === r.billTime });
  }

  const allMatch = checks.length > 0 && checks.every(c => c.match);
  const anyMismatch = checks.some(c => !c.match);
  return { checks, allMatch, anyMismatch };
}

function getScoreColor(score) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function DocumentCard({ doc, onRemove, onUpdateField, onRetry, onMarkException, uploadType }) {
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionRemarks, setExceptionRemarks] = useState('');

  const isAnalyzing = doc.status === 'uploading' || doc.status === 'analyzing';
  const isError = doc.status === 'error';
  const flags = doc.validation?.flags || [];
  const authScore = doc.validation?.authenticityScore;
  const confScore = doc.validation?.confidenceScore;
  const isHandwritten = doc.validation?.isHandwritten;
  const isLowQuality = doc.validation?.isLowQuality;
  const isDamaged = (confScore !== undefined && confScore < 50);
  const isCritical = flags.includes('POSSIBLE_FAKE') || flags.includes('INVALID_STRUCTURE');

  const handleMarkException = () => {
    if (!exceptionReason || !exceptionRemarks) return;
    onMarkException(doc.id, exceptionReason, exceptionRemarks);
    setShowExceptionForm(false);
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm overflow-hidden transition-all ${
      isCritical ? 'border-red-300' : flags.length > 0 ? 'border-amber-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isCritical ? 'bg-red-50' : flags.length > 0 ? 'bg-amber-50' : 'bg-gray-50'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {doc.fileType === 'application/pdf'
            ? <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
            : <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
          }
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{doc.fileName}</p>
            <p className="text-xs text-gray-400">{uploadType === 'bill' ? 'Bill' : 'Receipt'} · {doc.fileSize}</p>
            {isAnalyzing && (
              <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {doc.status === 'uploading' ? 'Uploading...' : 'Analyzing document...'}
              </p>
            )}
            {isError && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> {doc.error || 'Upload failed. Please retry.'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {authScore !== undefined && (
            <div className="flex items-center gap-1 text-xs mr-1">
              {authScore >= 80
                ? <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                : <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              }
              <span className={`font-semibold ${getScoreColor(authScore)}`}>{authScore}%</span>
            </div>
          )}
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Eye className="w-3.5 h-3.5 text-gray-500" />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => onRemove(doc.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b">
          {flags.map(flag => {
            const style = FLAG_STYLES[flag];
            if (!style) return null;
            return (
              <Badge key={flag} variant="outline" className={`text-xs ${style.color}`}>
                {style.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Handwritten Bill Notice */}
      {isHandwritten && doc.status === 'done' && (
        <div className="px-4 py-3 bg-blue-50 border-b flex items-start gap-2">
          <PenLine className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-blue-800">Handwritten Bill Detected</p>
            <p className="text-blue-700 mt-0.5">Some details could not be extracted automatically. Please fill in the required fields manually.</p>
          </div>
        </div>
      )}

      {/* Damaged / Unreadable Document */}
      {isDamaged && doc.status === 'done' && !doc.validation?.isExceptionCase && (
        <div className="px-4 py-3 bg-orange-50 border-b">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-orange-800">Document Unclear or Damaged</p>
              <p className="text-orange-700 mt-0.5">The uploaded document could not be read clearly. Please choose an option:</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => onRetry(doc.id)}>
              <RotateCcw className="w-3 h-3" /> Retry Upload
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-purple-700 border-purple-300 hover:bg-purple-50" onClick={() => setShowExceptionForm(true)}>
              <AlertTriangle className="w-3 h-3" /> Mark as Exception
            </Button>
          </div>
        </div>
      )}

      {/* Exception Case Form */}
      {showExceptionForm && (
        <div className="px-4 py-3 bg-purple-50 border-b space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Exception Case — Admin Review Required
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason for Exception <span className="text-red-500">*</span></Label>
            <Input value={exceptionReason} onChange={e => setExceptionReason(e.target.value)}
              placeholder="e.g., Original bill damaged during travel" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Remarks <span className="text-red-500">*</span></Label>
            <Textarea value={exceptionRemarks} onChange={e => setExceptionRemarks(e.target.value)}
              placeholder="Additional context for admin review" rows={2} className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-7 bg-purple-600 hover:bg-purple-700"
              onClick={handleMarkException} disabled={!exceptionReason || !exceptionRemarks}>
              Confirm Exception
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowExceptionForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Exception Confirmation */}
      {doc.validation?.isExceptionCase && (
        <div className="px-4 py-2 bg-purple-50 border-b flex items-center gap-2 text-xs text-purple-800">
          <Info className="w-3.5 h-3.5" />
          <span>Marked as exception — flagged for admin review. Reason: <em>{doc.validation.exceptionReason}</em></span>
        </div>
      )}

      {/* Upload Success Banner */}
      {doc.status === 'done' && !isCritical && (
        <div className="px-4 py-2.5 bg-green-50 border-b border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-green-700">Document uploaded & analyzed successfully</span>
          </div>
          {doc.fileUrl && (
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
              <ExternalLink className="w-3.5 h-3.5" /> View Document
            </a>
          )}
        </div>
      )}

    </div>
  );
}

function DropZone({ label, iconComponent: Icon, docType, onFiles, dragOverType, setDragOverType }) {
  const isOver = dragOverType === docType;
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${
        isOver ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOverType(docType); }}
      onDragLeave={() => setDragOverType(null)}
      onDrop={e => { e.preventDefault(); setDragOverType(null); onFiles(e.dataTransfer.files, docType); }}
      onClick={() => document.getElementById(`file-input-${docType}`).click()}
    >
      <Icon className={`w-6 h-6 mx-auto mb-1.5 ${isOver ? 'text-blue-500' : 'text-gray-400'}`} />
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, PDF — max {MAX_FILE_SIZE_MB}MB · 1 file per type</p>
      <input
        id={`file-input-${docType}`}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        className="hidden"
        onChange={e => { onFiles(e.target.files, docType); e.target.value = ''; }}
      />
    </div>
  );
}

export default function ClaimDocumentOCR({ category, headName, documents: documentsProp, onChange, onPaymentData }) {
  const documents = Array.isArray(documentsProp) ? documentsProp : [];
  const [analyzing, setAnalyzing] = useState({});
  const [dragOverType, setDragOverType] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = async (files, uploadType) => {
    const fileArray = Array.from(files);

    // Size validation
    const oversized = fileArray.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      alert(`File "${oversized.name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB. Please upload a smaller file.`);
      return;
    }

    // One-file-at-a-time: if a file of this type already exists, confirm replace
    const existingOfType = documents.filter(d => d.uploadType === uploadType);
    if (existingOfType.length > 0) {
      const confirmed = window.confirm(
        `A ${uploadType} is already uploaded. Do you want to replace it with the new file?`
      );
      if (!confirmed) return;
      // Remove existing docs of this type first
      onChange(prev => (Array.isArray(prev) ? prev : []).filter(d => d.uploadType !== uploadType));
    }

    // Only take the first file (one at a time)
    const file = fileArray[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) return;

    const newDocs = [];
    const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    newDocs.push({
      id,
      fileName: file.name,
      fileSize: formatSize(file.size),
      fileUrl: null,
      fileType: file.type,
      uploadType,
      status: 'uploading',
      extractedData: null,
      validation: null,
      formData: {}
    });

    onChange(prev => [...(Array.isArray(prev) ? prev : []).filter(d => d.uploadType !== uploadType), ...newDocs]);

    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      setAnalyzing(prev => ({ ...prev, [doc.id]: 'uploading' }));

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onChange(prev => prev.map(d => d.id === doc.id ? { ...d, fileUrl: file_url, status: 'analyzing' } : d));
        setAnalyzing(prev => ({ ...prev, [doc.id]: 'analyzing' }));

        let extractedData = {}, validation = { flags: [], confidenceScore: 100, authenticityScore: 100, isValidStructure: true };
        try {
          const ocrResult = await runOCRAndValidation(file_url, category?.title || '');
          extractedData = ocrResult.extractedData;
          validation = ocrResult.validation;
        } catch (ocrErr) {
          console.warn('OCR failed, proceeding without auto-fill:', ocrErr);
          validation = { flags: ['LOW_CONFIDENCE'], confidenceScore: 0, authenticityScore: 0, isValidStructure: false };
        }

        // Detect currency from extracted text
        const detectedCurrency = detectCurrency(
          extractedData.currency || extractedData.rawText || ''
        );
        extractedData.currency = detectedCurrency;

        const formData = {
          vendor_name: extractedData.vendorName || '',
          restaurant_name: extractedData.restaurantName || extractedData.vendorName || '',
          bill_number: extractedData.billNumber || '',
          bill_date: extractedData.billDate || '',
          amount: extractedData.totalAmount || '',
          currency: detectedCurrency,
          purpose: extractedData.vendorName || category?.title || '',
          from_location: extractedData.from || '',
          to_location: extractedData.to || '',
          check_in: extractedData.checkIn || '',
          check_out: extractedData.checkOut || '',
          quantity: extractedData.quantity || '',
          rate_per_liter: extractedData.ratePerLiter || '',
        };

        onChange(prev => {
          const updated = (Array.isArray(prev) ? prev : []).map(d =>
            d.id === doc.id ? { ...d, status: 'done', extractedData, validation, formData } : d
          );
          // Auto-fill payment details from receipt (or bill if no receipt)
          if (onPaymentData && (uploadType === 'receipt' || uploadType === 'bill')) {
            const paymentDoc = updated.find(d => d.uploadType === 'receipt' && d.extractedData) ||
                               updated.find(d => d.uploadType === 'bill' && d.extractedData);
            if (paymentDoc?.extractedData) {
              const ed = paymentDoc.extractedData;
              onPaymentData({
                payment_mode: ed.paymentMode || '',
                reference_number: ed.transactionId || '',
                payment_date: ed.billDate || '',
              });
            }
          }
          return updated;
        });
      } catch (uploadErr) {
        console.error('Upload failed:', uploadErr);
        onChange(prev => (Array.isArray(prev) ? prev : []).map(d =>
          d.id === doc.id ? { ...d, status: 'error', error: 'Upload failed. Please retry.' } : d
        ));
      }
      setAnalyzing(prev => { const n = { ...prev }; delete n[doc.id]; return n; });
    }
  };

  const removeDoc = (id) => {
    onChange(prev => {
      const remaining = (Array.isArray(prev) ? prev : []).filter(d => d.id !== id);
      // Clear payment reference ID if no docs left (or if the removed doc was the one providing it)
      if (onPaymentData) {
        const stillHasDocs = remaining.some(d => d.extractedData?.transactionId);
        if (!stillHasDocs) {
          onPaymentData({ payment_mode: '', reference_number: '', payment_date: '' });
        } else {
          // Re-derive from remaining docs
          const best = remaining.find(d => d.uploadType === 'receipt' && d.extractedData) ||
                        remaining.find(d => d.uploadType === 'bill' && d.extractedData);
          if (best?.extractedData) {
            onPaymentData({
              payment_mode: best.extractedData.paymentMode || '',
              reference_number: best.extractedData.transactionId || '',
              payment_date: best.extractedData.billDate || '',
            });
          }
        }
      }
      return remaining;
    });
  };

  const updateDocField = (docId, key, val) => {
    onChange(prev => (Array.isArray(prev) ? prev : []).map(d => d.id === docId ? { ...d, formData: { ...d.formData, [key]: val } } : d));
  };

  const retryUpload = (id) => {
    removeDoc(id);
  };

  const markException = (id, reason, remarks) => {
    onChange(prev => prev.map(d => d.id === id
      ? { ...d, validation: { ...d.validation, isExceptionCase: true, exceptionReason: reason, exceptionRemarks: remarks, flags: [...(d.validation?.flags || []), 'EXCEPTION_CASE'] } }
      : d
    ));
  };

  const bills = documents.filter(d => d.uploadType === 'bill');
  const receipts = documents.filter(d => d.uploadType === 'receipt');

  // Cross-verify first bill vs first receipt
  const crossVerifyResult = bills.length > 0 && receipts.length > 0
    ? crossVerify(
        bills.find(d => d.status === 'done'),
        receipts.find(d => d.status === 'done')
      )
    : null;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Two Upload Zones */}
      <div className="grid grid-cols-2 gap-4">
        <DropZone
          label="Upload Bill"
          iconComponent={FileText}
          docType="bill"
          onFiles={processFiles}
          dragOverType={dragOverType}
          setDragOverType={setDragOverType}
        />
        <DropZone
          label="Upload Receipt"
          iconComponent={Receipt}
          docType="receipt"
          onFiles={processFiles}
          dragOverType={dragOverType}
          setDragOverType={setDragOverType}
        />
      </div>

      {/* Bills */}
      {bills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Bills ({bills.length})</h4>
          </div>
          {bills.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              uploadType="bill"
              onRemove={removeDoc}
              onUpdateField={updateDocField}
              onRetry={retryUpload}
              onMarkException={markException}
            />
          ))}
        </div>
      )}

      {/* Receipts */}
      {receipts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Receipts ({receipts.length})</h4>
          </div>
          {receipts.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              uploadType="receipt"
              onRemove={removeDoc}
              onUpdateField={updateDocField}
              onRetry={retryUpload}
              onMarkException={markException}
            />
          ))}
        </div>
      )}

      {/* Cross-verification result */}
      {crossVerifyResult && crossVerifyResult.checks.length > 0 && (
        <div className={`rounded-lg border p-4 space-y-2 ${crossVerifyResult.allMatch ? 'bg-green-50 border-green-200' : crossVerifyResult.anyMismatch ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {crossVerifyResult.allMatch
              ? <ShieldCheck className="w-4 h-4 text-green-600" />
              : <ShieldAlert className="w-4 h-4 text-red-500" />}
            <p className={`text-sm font-semibold ${crossVerifyResult.allMatch ? 'text-green-800' : 'text-red-800'}`}>
              {crossVerifyResult.allMatch ? 'Bill & Receipt Cross-Verified ✓' : 'Cross-Verification Issues Detected'}
            </p>
          </div>
          <div className="space-y-1">
            {crossVerifyResult.checks.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 w-32 font-medium">{c.field}</span>
                <span className="text-gray-500 flex-1">Bill: <strong>{c.bill}</strong></span>
                <span className="text-gray-500 flex-1">Receipt: <strong>{c.receipt}</strong></span>
                <span className={`ml-2 font-semibold ${c.match ? 'text-green-600' : 'text-red-600'}`}>
                  {c.match ? '✓ Match' : '✗ Mismatch'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No documents uploaded yet.</p>
      )}
    </div>
  );
}