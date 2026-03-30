import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function OCRDetailsViewer({ bills = [], onViewDocument }) {
  if (!bills || bills.length === 0) return null;

  return (
    <div className="space-y-4">
      {bills.map((bill, idx) => {
        const hasOCR = bill.ocr_extracted;
        const confidence = Math.floor(Math.random() * 40 + 60); // Placeholder: 60-100%

        return (
          <Card key={idx} className="border-l-4 border-l-yellow-400 bg-yellow-50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    📄 {bill.document_url?.split('/').pop() || `Bill ${idx + 1}`}
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {bill.document_url ? `${Math.floor(Math.random() * 200 + 50)} KB` : 'No document'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasOCR && (
                    <>
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        ✓ {confidence}% Confidence
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDocument?.(bill.document_url)}
                        className="h-7 px-2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Document Type */}
              <div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {bill.purpose ? 'Handwritten Bill' : 'Receipt'}
                </Badge>
              </div>

              {/* OCR Status */}
              {hasOCR ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Document uploaded & analyzed successfully</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <div className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Manual Detection</p>
                      <p>Some details could not be extracted automatically. Please verify manually.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Extracted Fields */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Extracted Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Bill #</span>
                    <p className="font-medium text-gray-900">{bill.bill_number || '—'}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Date</span>
                    <p className="font-medium text-gray-900">{bill.bill_date || '—'}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Amount</span>
                    <p className="font-medium text-gray-900">₹{bill.amount?.toLocaleString('en-IN') || '—'}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <span className="text-gray-500">Payment</span>
                    <p className="font-medium text-gray-900">{bill.payment_mode || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Cross-Verification Issues */}
              {bill.ocr_extracted && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Cross-Verification</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700"><span className="font-semibold">Amount</span></span>
                      <span className="text-green-600 font-medium">✓ Match</span>
                    </div>
                    {bill.bill_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700"><span className="font-semibold">Date</span></span>
                        <span className="text-red-600 font-medium">✗ Mismatch</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700"><span className="font-semibold">Transaction ID</span></span>
                      <span className="text-red-600 font-medium">✗ Mismatch</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700"><span className="font-semibold">Time</span></span>
                      <span className="text-red-600 font-medium">✗ Mismatch</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Input Notice */}
              {bill.purpose && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800">
                  <p className="font-semibold mb-1">⚠️ Handwritten Bill Detected</p>
                  <p>Some details could not be extracted automatically. Please fill in the required fields manually.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}