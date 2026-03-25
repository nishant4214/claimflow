import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, Trash2, Eye, Sparkles, AlertTriangle,
  CheckCircle, XCircle, Loader2, ShieldAlert, ShieldCheck
} from 'lucide-react';

const FLAG_STYLES = {
  LOW_CONFIDENCE:    { label: '⚠ Low Confidence',     color: 'bg-amber-100 text-amber-800 border-amber-300' },
  DUPLICATE:         { label: '⚠ Duplicate Bill',      color: 'bg-red-100 text-red-800 border-red-300' },
  MISMATCH:          { label: '⚠ Data Mismatch',       color: 'bg-orange-100 text-orange-800 border-orange-300' },
  INVALID_STRUCTURE: { label: '✗ Invalid Bill',         color: 'bg-red-100 text-red-800 border-red-300' },
  POSSIBLE_FAKE:     { label: '✗ Possible Fake',        color: 'bg-red-100 text-red-800 border-red-300' },
  ANOMALY:           { label: '⚠ Anomaly Detected',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

async function runOCRAndValidation(fileUrl, categoryTitle) {
  const prompt = `You are an expert OCR and expense bill fraud detection system. 

Analyze this bill/receipt image carefully and return a JSON object with the following structure:

{
  "extractedData": {
    "vendorName": "string or null",
    "billNumber": "string or null",
    "billDate": "YYYY-MM-DD or null",
    "totalAmount": "number or null",
    "taxAmount": "number or null",
    "currency": "INR or USD etc",
    "paymentMode": "Cash/Card/UPI or null",
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
    "isValidStructure": true or false,
    "hasVendorName": true or false,
    "hasAmount": true or false,
    "hasDate": true or false,
    "authenticityScore": 0-100,
    "confidenceScore": 0-100,
    "possibleFake": true or false,
    "fakeReasons": ["reason1", "reason2"],
    "flags": []
  }
}

For authenticityScore:
- 90-100: Clearly authentic receipt with all details
- 70-89: Looks legitimate but missing some details
- 50-69: Suspicious - missing key fields or inconsistent
- 0-49: Likely fake or tampered

For flags array, include any of: "LOW_CONFIDENCE", "INVALID_STRUCTURE", "POSSIBLE_FAKE", "ANOMALY"

Category context: ${categoryTitle}. Return ONLY valid JSON, no markdown.`;

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

  // Enrich flags
  const flags = [...(validation.flags || [])];
  if ((validation.confidenceScore || 100) < 80 && !flags.includes('LOW_CONFIDENCE')) flags.push('LOW_CONFIDENCE');
  if (!validation.isValidStructure && !flags.includes('INVALID_STRUCTURE')) flags.push('INVALID_STRUCTURE');
  if (validation.possibleFake && !flags.includes('POSSIBLE_FAKE')) flags.push('POSSIBLE_FAKE');

  return {
    extractedData: data.extractedData || {},
    validation: { ...validation, flags }
  };
}

export default function ClaimDocumentOCR({ category, headName, documents, onChange }) {
  const [analyzing, setAnalyzing] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files) => {
    const newDocs = [];
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const doc = {
        id,
        fileName: file.name,
        fileUrl: null,
        fileType: file.type,
        status: 'uploading',
        extractedData: null,
        validation: null,
        formData: {}
      };
      newDocs.push(doc);
    }

    const updated = [...documents, ...newDocs];
    onChange(updated);

    // Upload and analyze each
    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i];
      const file = Array.from(files)[i];
      setAnalyzing(prev => ({ ...prev, [doc.id]: 'uploading' }));

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const withUrl = { ...doc, fileUrl: file_url, status: 'analyzing' };
      onChange(prev => prev.map(d => d.id === doc.id ? withUrl : d));
      setAnalyzing(prev => ({ ...prev, [doc.id]: 'analyzing' }));

      const { extractedData, validation } = await runOCRAndValidation(file_url, category?.title || '');

      // Auto-fill formData from OCR
      const formData = {
        vendor_name: extractedData.vendorName || '',
        restaurant_name: extractedData.restaurantName || extractedData.vendorName || '',
        hotel_name: extractedData.vendorName || '',
        bill_number: extractedData.billNumber || '',
        bill_date: extractedData.billDate || '',
        amount: extractedData.totalAmount || '',
        currency: extractedData.currency || 'INR',
        purpose: extractedData.vendorName || category?.title || '',
        from_location: extractedData.from || '',
        to_location: extractedData.to || '',
        ride_id: extractedData.rideId || '',
        check_in: extractedData.checkIn || '',
        check_out: extractedData.checkOut || '',
        quantity: extractedData.quantity || '',
        rate_per_liter: extractedData.ratePerLiter || '',
      };

      onChange(prev => prev.map(d => d.id === doc.id
        ? { ...withUrl, status: 'done', extractedData, validation, formData }
        : d
      ));
      setAnalyzing(prev => { const n = { ...prev }; delete n[doc.id]; return n; });
    }
  };

  const removeDoc = (id) => onChange(documents.filter(d => d.id !== id));

  const updateDocField = (docId, key, val) => {
    onChange(documents.map(d => d.id === docId ? { ...d, formData: { ...d.formData, [key]: val } } : d));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById('ocr-file-input').click()}
      >
        <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="font-medium text-gray-700">Click or drag files here</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB each</p>
        <input
          id="ocr-file-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Document Cards */}
      {documents.map(doc => {
        const isAnalyzing = analyzing[doc.id];
        const flags = doc.validation?.flags || [];
        const authScore = doc.validation?.authenticityScore;
        const confScore = doc.validation?.confidenceScore;

        return (
          <div key={doc.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${
            flags.includes('POSSIBLE_FAKE') || flags.includes('INVALID_STRUCTURE') ? 'border-red-300' :
            flags.length > 0 ? 'border-amber-300' : 'border-gray-200'
          }`}>
            {/* Card Header */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              flags.includes('POSSIBLE_FAKE') || flags.includes('INVALID_STRUCTURE') ? 'bg-red-50' :
              flags.length > 0 ? 'bg-amber-50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="text-xl">
                  {doc.fileType === 'application/pdf' ? '📄' : '🖼️'}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900 truncate max-w-xs">{doc.fileName}</p>
                  {isAnalyzing && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isAnalyzing === 'uploading' ? 'Uploading...' : 'Analyzing bill authenticity...'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Scores */}
                {authScore !== undefined && (
                  <div className="text-right text-xs">
                    <div className="flex items-center gap-1">
                      {authScore >= 80 ? <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                      <span className={`font-bold ${getScoreColor(authScore)}`}>{authScore}%</span>
                      <span className="text-gray-400">auth</span>
                    </div>
                  </div>
                )}
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeDoc(doc.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Flags */}
            {flags.length > 0 && (
              <div className="px-5 py-2 flex flex-wrap gap-1.5 border-b bg-white">
                {flags.map(flag => {
                  const style = FLAG_STYLES[flag];
                  if (!style) return null;
                  return (
                    <Badge key={flag} className={`text-xs border ${style.color}`}>
                      {style.label}
                    </Badge>
                  );
                })}
                {doc.validation?.fakeReasons?.map((reason, i) => (
                  <span key={i} className="text-xs text-red-600 italic">· {reason}</span>
                ))}
              </div>
            )}

            {/* Extracted Data Fields (editable) */}
            {doc.status === 'done' && doc.extractedData && (
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700">OCR Extracted — Please Verify</span>
                  {confScore !== undefined && (
                    <span className={`text-xs ${getScoreColor(confScore)}`}>Confidence: {confScore}%</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'vendor_name', label: 'Vendor', ocr: doc.extractedData.vendorName },
                    { key: 'bill_number', label: 'Bill No.', ocr: doc.extractedData.billNumber },
                    { key: 'bill_date', label: 'Date', type: 'date', ocr: doc.extractedData.billDate },
                    { key: 'amount', label: 'Amount', type: 'number', ocr: doc.extractedData.totalAmount },
                    { key: 'currency', label: 'Currency', ocr: doc.extractedData.currency },
                    { key: 'purpose', label: 'Purpose', ocr: '' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-[11px] text-gray-500">{field.label}</Label>
                      <Input
                        type={field.type || 'text'}
                        value={doc.formData?.[field.key] || ''}
                        onChange={e => updateDocField(doc.id, field.key, e.target.value)}
                        className={`h-8 text-xs ${
                          field.ocr && doc.formData?.[field.key] != field.ocr
                            ? 'border-orange-400 bg-orange-50'
                            : doc.formData?.[field.key] ? 'border-purple-300 bg-purple-50' : ''
                        }`}
                        placeholder={String(field.ocr || '')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}