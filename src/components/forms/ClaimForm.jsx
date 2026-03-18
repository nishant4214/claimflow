import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from 'date-fns';
import {
  CalendarIcon, Upload, FileText, AlertCircle,
  Loader2, CheckCircle, X, IndianRupee, Info, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer'];

// ── OCR helper ────────────────────────────────────────────────────────────────
// Returns an array of bill objects (handles multi-bill PDFs)
async function extractBillData(fileUrl) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert bill/invoice OCR extractor. Carefully analyze this document.

IMPORTANT: A single PDF/image may contain MULTIPLE separate bills or receipts. Each distinct bill/receipt/invoice is a separate transaction with its own amount, date, and purpose.

Identify ALL individual bills/receipts in the document and return them as an array.

For EACH bill extract:
- purpose: string (what this specific bill is for, e.g. "Hotel Stay", "Flight Ticket", "Dinner", "Taxi Ride", "Fuel", "Stationery")
- bill_number: string (invoice/receipt number for this specific bill, or null)
- bill_date: string in YYYY-MM-DD format (date on this specific bill, or null)
- amount: number (total amount for this specific bill, numeric only, no currency symbols)
- currency: string (ISO 4217 currency code, e.g. "INR", "USD", "EUR". Default "INR" if unclear)
- payment_mode: string — must be exactly one of: "Cash", "Card", "UPI", "Bank Transfer" (infer from context, default "Cash")

Return a JSON object with a single key "bills" containing an array. Even if there is only one bill, return it as an array with one item.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          bills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                purpose: { type: "string" },
                bill_number: { type: "string" },
                bill_date: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                payment_mode: { type: "string" }
              }
            }
          }
        }
      }
    });
    // Normalize: always return array
    if (result && Array.isArray(result.bills) && result.bills.length > 0) {
      return result.bills;
    }
    // Fallback if LLM returned flat object
    if (result && result.purpose) {
      return [result];
    }
    return [{ purpose: '', bill_number: '', bill_date: '', amount: '', currency: 'INR', payment_mode: 'Cash' }];
  } catch (e) {
    return [{ purpose: '', bill_number: '', bill_date: '', amount: '', currency: 'INR', payment_mode: 'Cash' }];
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClaimForm({ user, onSubmit, initialData, isLoading, isEditing = false }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    employee_name: user?.full_name || '',
    employee_email: user?.email || '',
    department: user?.department || '',
    designation: user?.designation || '',
    expense_date_from: '',
    expense_date_to: '',
    expense_date: '',
    category_id: '',
    category_name: '',
    description: '',
    claim_type: 'normal',
    is_torch_bearer: user?.is_torch_bearer || false,
    bills: [],
    document_urls: [],
    // Legacy single-bill fields (derived from first bill for compatibility)
    purpose: '',
    bill_number: '',
    bill_date: '',
    amount: '',
    payment_mode: '',
    ...(initialData || {}),
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [extractingOcr, setExtractingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState({});

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ is_active: true }),
  });

  const selectedCategory = categories.find(c => c.id === formData.category_id);

  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.category_name]) acc[cat.category_name] = [];
    acc[cat.category_name].push(cat);
    return acc;
  }, {});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setFormData(prev => ({
        ...prev,
        category_id: categoryId,
        category_name: `${category.category_name} - ${category.title}`,
        claim_type: category.is_sales_promotion ? 'sales_promotion' : 'normal',
      }));
    }
  };

  const handleBillChange = (index, field, value) => {
    setFormData(prev => {
      const bills = [...prev.bills];
      bills[index] = { ...bills[index], [field]: value };
      return { ...prev, bills };
    });
  };

  // Step 1: Upload documents + run OCR
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const newBills = [];
    const newUrls = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5MB`); continue; }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) { toast.error(`${file.name} is not a valid type`); continue; }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newUrls.push(file_url);
      newBills.push({ document_url: file_url, purpose: '', bill_number: '', bill_date: '', amount: '', currency: 'INR', payment_mode: 'Cash', ocr_extracted: false });
    }

    setFormData(prev => ({
      ...prev,
      document_urls: [...prev.document_urls, ...newUrls],
      bills: [...prev.bills, ...newBills],
    }));
    setUploadingFiles(false);
    toast.success(`${newBills.length} file(s) uploaded`);

    // Auto-run OCR
    if (newBills.length > 0) {
      setExtractingOcr(true);
      setOcrProgress({ current: 0, total: newUrls.length });

      // Process each uploaded file, potentially expanding into multiple bills
      const allExtractedBills = [];
      for (let i = 0; i < newUrls.length; i++) {
        setOcrProgress({ current: i + 1, total: newUrls.length });
        const extractedArray = await extractBillData(newUrls[i]);
        // Each extracted bill references the same source document
        extractedArray.forEach(extracted => {
          allExtractedBills.push({
            document_url: newUrls[i],
            purpose: extracted.purpose || '',
            bill_number: extracted.bill_number || '',
            bill_date: extracted.bill_date || '',
            amount: extracted.amount || '',
            currency: extracted.currency || 'INR',
            payment_mode: extracted.payment_mode || 'Cash',
            ocr_extracted: true,
          });
        });
      }

      // Replace the placeholder bills (created during upload) with OCR-expanded bills
      setFormData(prev => {
        // Keep any pre-existing bills, then add all new OCR-expanded ones
        const existingBills = prev.bills.filter(b => !newUrls.includes(b.document_url));
        const existingUrls = existingBills.map(b => b.document_url);
        return {
          ...prev,
          bills: [...existingBills, ...allExtractedBills],
          document_urls: [...existingUrls, ...newUrls],
        };
      });

      setExtractingOcr(false);
      const totalExtracted = allExtractedBills.length;
      const totalFiles = newUrls.length;
      if (totalExtracted > totalFiles) {
        toast.success(`OCR complete — found ${totalExtracted} bills across ${totalFiles} file(s)`);
      } else {
        toast.success('OCR extraction complete — review bill details below');
      }
    }
  };

  const removeBill = (index) => {
    setFormData(prev => ({
      ...prev,
      bills: prev.bills.filter((_, i) => i !== index),
      document_urls: prev.document_urls.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (formData.bills.length === 0) errs.bills = 'Please upload at least one bill document';
    }
    if (s === 2) {
      if (!formData.expense_date_from) errs.expense_date_from = 'Required';
      if (!formData.expense_date_to) errs.expense_date_to = 'Required';
      if (!formData.category_id) errs.category_id = 'Required';
    }
    if (s === 3) {
      formData.bills.forEach((bill, i) => {
        if (!bill.purpose) errs[`bill_${i}_purpose`] = 'Required';
        if (!bill.amount || bill.amount <= 0) errs[`bill_${i}_amount`] = 'Required';
        if (!bill.payment_mode) errs[`bill_${i}_payment_mode`] = 'Required';
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const totalAmount = formData.bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  const handleSubmit = () => {
    if (!validateStep(3)) return;
    const firstBill = formData.bills[0] || {};
    const submitData = {
      ...formData,
      expense_date: formData.expense_date_from,
      purpose: formData.bills.map(b => b.purpose).filter(Boolean).join('; '),
      bill_number: firstBill.bill_number || '',
      bill_date: firstBill.bill_date || '',
      amount: totalAmount,
      payment_mode: firstBill.payment_mode || 'Cash',
      status: 'submitted',
      current_approver_role: formData.claim_type === 'sales_promotion' ? 'manager' : 'junior_admin',
    };
    if (!isEditing) {
      submitData.sla_date = format(addDays(new Date(), 45), 'yyyy-MM-dd');
      submitData.claim_number = `CLM-${Date.now().toString(36).toUpperCase()}`;
    }
    onSubmit(submitData);
  };

  const saveDraft = () => {
    const firstBill = formData.bills[0] || {};
    onSubmit({
      ...formData,
      expense_date: formData.expense_date_from || '',
      purpose: formData.bills.map(b => b.purpose).filter(Boolean).join('; ') || '',
      amount: totalAmount || 0,
      bill_number: firstBill.bill_number || '',
      bill_date: firstBill.bill_date || '',
      payment_mode: firstBill.payment_mode || 'Cash',
      status: 'draft',
    });
  };

  const steps = [
    { num: 1, title: 'Upload Bills', subtitle: 'Attach documents' },
    { num: 2, title: 'Basic Info', subtitle: 'Expense details' },
    { num: 3, title: 'Bill Details', subtitle: 'Per-bill info' },
    { num: 4, title: 'Review', subtitle: 'Confirm & submit' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>{s.title}</p>
                  <p className="text-xs text-gray-400 hidden sm:block">{s.subtitle}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

          {/* ── STEP 1: Upload Bills ─────────────────────────────── */}
          {step === 1 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Upload Bills</CardTitle>
                <CardDescription>Upload one or more bill documents. OCR will auto-extract details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Drop zone */}
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  errors.bills ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                }`}>
                  <input type="file" id="file-upload" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" disabled={uploadingFiles || extractingOcr} />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadingFiles ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                        <p className="text-sm text-gray-600">Uploading files...</p>
                      </div>
                    ) : extractingOcr ? (
                      <div className="flex flex-col items-center">
                        <Sparkles className="w-10 h-10 text-purple-600 animate-pulse mb-3" />
                        <p className="text-sm font-medium text-purple-700">Extracting bill data with OCR...</p>
                        <p className="text-xs text-gray-500 mt-1">Processing bill {ocrProgress.current} of {ocrProgress.total}</p>
                        <div className="mt-3 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 5MB each — multiple files allowed</p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.bills && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.bills}</p>}

                {/* Uploaded bills list */}
                {formData.bills.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Uploaded Documents ({formData.bills.length})</Label>
                    {formData.bills.map((bill, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Bill {i + 1}</p>
                            {bill.ocr_extracted && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                <Sparkles className="w-3 h-3" /> OCR extracted
                              </span>
                            )}
                            {!bill.ocr_extracted && extractingOcr && (
                              <span className="text-xs text-gray-400">Extracting...</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={bill.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                          <Button variant="ghost" size="sm" onClick={() => removeBill(i)} className="text-red-500 hover:bg-red-50 h-7 w-7 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── STEP 2: Basic Info ───────────────────────────────── */}
          {step === 2 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the general expense details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Read-only employee info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div><Label className="text-xs text-gray-500">Employee Name</Label><p className="font-medium">{formData.employee_name}</p></div>
                  <div><Label className="text-xs text-gray-500">Department</Label><p className="font-medium">{formData.department || 'Not set'}</p></div>
                </div>

                {/* Date FROM / TO */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Date From <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${errors.expense_date_from ? 'border-red-500' : ''}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expense_date_from ? format(new Date(formData.expense_date_from), 'PPP') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expense_date_from ? new Date(formData.expense_date_from) : undefined}
                          onSelect={(d) => handleChange('expense_date_from', d ? format(d, 'yyyy-MM-dd') : '')}
                          disabled={(d) => d > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.expense_date_from && <p className="text-xs text-red-500">{errors.expense_date_from}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Expense Date To <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${errors.expense_date_to ? 'border-red-500' : ''}`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expense_date_to ? format(new Date(formData.expense_date_to), 'PPP') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expense_date_to ? new Date(formData.expense_date_to) : undefined}
                          onSelect={(d) => handleChange('expense_date_to', d ? format(d, 'yyyy-MM-dd') : '')}
                          disabled={(d) => d > new Date() || (formData.expense_date_from && d < new Date(formData.expense_date_from))}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.expense_date_to && <p className="text-xs text-red-500">{errors.expense_date_to}</p>}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category <span className="text-red-500">*</span></Label>
                  <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                    <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedCategories).map(([group, cats]) => (
                        <React.Fragment key={group}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">{group}</div>
                          {cats.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{cat.title}</span>
                                {cat.policy_limit && <span className="text-xs text-gray-400 ml-2">≤ ₹{cat.policy_limit.toLocaleString()}</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && <p className="text-xs text-red-500">{errors.category_id}</p>}
                </div>

                {selectedCategory && (
                  <div className={`p-4 rounded-lg border ${selectedCategory.is_sales_promotion ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`w-5 h-5 mt-0.5 ${selectedCategory.is_sales_promotion ? 'text-purple-600' : 'text-blue-600'}`} />
                      <div className="text-sm">
                        <p className="font-medium">{selectedCategory.is_sales_promotion ? 'Sales Promotion Claim' : 'Normal Reimbursement'}</p>
                        <p className="text-gray-600 mt-1">{selectedCategory.description}</p>
                        {selectedCategory.policy_limit && (
                          <p className="text-xs mt-1">Policy Limit: ₹{selectedCategory.policy_limit.toLocaleString()} &bull; Bill Required: {selectedCategory.bill_required ? 'Yes' : 'No'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea placeholder="Any additional context or details..." value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── STEP 3: Bill Details (per document) ─────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Bill Details</h2>
                  <p className="text-sm text-gray-500">Review and correct OCR-extracted data for each bill</p>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                  {formData.bills.length} bill(s) · Total ₹{totalAmount.toLocaleString('en-IN')}
                </Badge>
              </div>

              {formData.bills.map((bill, i) => (
                <BillDetailCard
                  key={i}
                  bill={bill}
                  index={i}
                  errors={errors}
                  onChange={(field, val) => handleBillChange(i, field, val)}
                />
              ))}
            </div>
          )}

          {/* ── STEP 4: Review ───────────────────────────────────── */}
          {step === 4 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Review & Submit</CardTitle>
                <CardDescription>Confirm your claim details before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary header */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-semibold">{formData.category_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expense Period</p>
                      <p className="font-semibold">
                        {formData.expense_date_from && format(new Date(formData.expense_date_from), 'dd MMM')} — {formData.expense_date_to && format(new Date(formData.expense_date_to), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-bold text-xl text-blue-700">₹{totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Per-bill review */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Bills Summary</Label>
                  {formData.bills.map((bill, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">{i + 1}</div>
                        <div>
                          <p className="font-medium text-sm">{bill.purpose || 'Untitled bill'}</p>
                          <p className="text-xs text-gray-400">
                            {bill.bill_number ? `#${bill.bill_number}` : 'No bill no.'} &bull; {bill.bill_date || 'No date'} &bull; {bill.payment_mode} &bull; {bill.currency || 'INR'}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">₹{parseFloat(bill.amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>

                {/* Documents */}
                <div>
                  <Label className="text-sm font-semibold">Attached Documents ({formData.bills.length})</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.bills.map((bill, i) => (
                      <a key={i} href={bill.document_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-blue-600 hover:border-blue-300">
                        <FileText className="w-3 h-3" /> Bill {i + 1}
                      </a>
                    ))}
                  </div>
                </div>

                {formData.description && (
                  <div>
                    <Label className="text-sm font-semibold">Notes</Label>
                    <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={saveDraft} disabled={isLoading}>Save Draft</Button>
          {step < 4 ? (
            <Button onClick={() => { if (validateStep(step)) setStep(step + 1); }} className="bg-blue-600 hover:bg-blue-700">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditing ? 'Resubmitting...' : 'Submitting...'}</> : isEditing ? 'Resubmit Claim' : 'Submit Claim'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── BillDetailCard sub-component ─────────────────────────────────────────────
function BillDetailCard({ bill, index, errors, onChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="py-3 px-5 cursor-pointer" onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">{index + 1}</div>
            <div>
              <p className="font-medium text-sm">{bill.purpose || `Bill ${index + 1}`}</p>
              {bill.amount ? <p className="text-xs text-gray-400">₹{parseFloat(bill.amount).toLocaleString('en-IN')}</p> : null}
            </div>
            {bill.ocr_extracted && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-0.5 ml-1">
                <Sparkles className="w-3 h-3 mr-1" /> OCR
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={bill.document_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">View doc</a>
            {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 px-5 pb-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Purpose <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Hotel Stay, Taxi" value={bill.purpose || ''} onChange={e => onChange('purpose', e.target.value)} className={errors[`bill_${index}_purpose`] ? 'border-red-500' : ''} />
              {errors[`bill_${index}_purpose`] && <p className="text-xs text-red-500">{errors[`bill_${index}_purpose`]}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bill Number</Label>
              <Input placeholder="Invoice/Receipt number" value={bill.bill_number || ''} onChange={e => onChange('bill_number', e.target.value)} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Bill Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-sm h-9">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {bill.bill_date ? format(new Date(bill.bill_date), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bill.bill_date ? new Date(bill.bill_date) : undefined}
                    onSelect={(d) => onChange('bill_date', d ? format(d, 'yyyy-MM-dd') : '')}
                    disabled={(d) => d > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Amount <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Currency"
                  value={bill.currency || 'INR'}
                  onChange={e => onChange('currency', e.target.value.toUpperCase())}
                  className="w-20 text-center font-mono text-sm uppercase"
                  maxLength={3}
                />
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input type="number" placeholder="0.00" value={bill.amount || ''} onChange={e => onChange('amount', e.target.value)} className={`pl-9 ${errors[`bill_${index}_amount`] ? 'border-red-500' : ''}`} />
                </div>
              </div>
              {bill.currency && bill.currency !== 'INR' && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Foreign currency ({bill.currency}) — conversion to INR may apply
                </p>
              )}
              {errors[`bill_${index}_amount`] && <p className="text-xs text-red-500">{errors[`bill_${index}_amount`]}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Payment Mode <span className="text-red-500">*</span></Label>
            <Select value={bill.payment_mode || ''} onValueChange={val => onChange('payment_mode', val)}>
              <SelectTrigger className={`h-9 ${errors[`bill_${index}_payment_mode`] ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors[`bill_${index}_payment_mode`] && <p className="text-xs text-red-500">{errors[`bill_${index}_payment_mode`]}</p>}
          </div>
        </CardContent>
      )}
    </Card>
  );
}