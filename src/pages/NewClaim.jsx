import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Send, Loader2, FileText, Upload, CreditCard, ClipboardList, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ClaimCategorySidebar from '@/components/claims/ClaimCategorySidebar';
import ClaimDynamicForm from '@/components/claims/ClaimDynamicForm';
import ClaimDocumentOCR from '@/components/claims/ClaimDocumentOCR';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';

// A single claim entry: { id, head, subHead, formData, documents } — v2
function makeEntry(head, subHead) {
  return { id: `${Date.now()}-${Math.random()}`, head, subHead, formData: {}, documents: [] };
}

export default function NewClaim() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [travelType, setTravelType] = useState('Domestic');

  // Generate a unique claim number for this session (used for MainClaim)
  const [claimNumber] = useState(() => {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `CLM-${year}-${rand}`;
  });

  // Multi-entry state
  const [entries, setEntries] = useState([]);           // array of claim entries
  const [activeEntryId, setActiveEntryId] = useState(null);

  const [expensePeriod, setExpensePeriod] = useState({ date_from: '', date_to: '' });
  const periodSet = !!(expensePeriod.date_from && expensePeriod.date_to);

  const [paymentDetails, setPaymentDetails] = useState({
    payment_mode: 'Cash', reference_number: '', payment_date: '', remarks: ''
  });
  const [activeTab, setActiveTab] = useState('documents');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideWarnings, setOverrideWarnings] = useState(false);

  useEffect(() => {
    const init = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const cats = await base44.entities.Category.filter({ is_active: true }, 'sort_order');
      setCategories(cats);
    };
    init();
  }, []);

  const headGroups = categories.reduce((acc, cat) => {
    if (!acc[cat.category_name]) acc[cat.category_name] = [];
    acc[cat.category_name].push(cat);
    return acc;
  }, {});

  const activeEntry = entries.find(e => e.id === activeEntryId) || null;

  const updateActiveEntry = (patch) => {
    setEntries(prev => prev.map(e => e.id === activeEntryId ? { ...e, ...patch } : e));
  };

  const totalAmount = entries.reduce((sum, entry) => {
    const amt = parseFloat(entry.formData?.amount) || 0;
    return sum + amt;
  }, 0);

  const criticalFlags = entries.some(e => Array.isArray(e.documents) && e.documents.some(doc =>
    (doc.validation?.authenticityScore || 100) < 50 ||
    doc.validation?.flags?.includes('INVALID_STRUCTURE') ||
    doc.validation?.flags?.includes('POSSIBLE_FAKE')
  ));

  const hasAnyWarnings = entries.some(e => Array.isArray(e.documents) && e.documents.some(doc => doc.validation?.flags?.length > 0));

  // Auto-fill payment details from OCR — handled via onPaymentData callback now

  const handleCategorySelect = (head, subHead) => {
    // Check if this exact subHead is already added
    const existing = entries.find(e => e.subHead?.id === subHead.id);
    if (existing) {
      setActiveEntryId(existing.id);
      setActiveTab('form');
      return;
    }
    const newEntry = makeEntry(head, subHead);
    setEntries(prev => [...prev, newEntry]);
    setActiveEntryId(newEntry.id);
    setActiveTab('documents');
  };

  const handleRemoveEntry = (id, e) => {
    e.stopPropagation();
    setEntries(prev => {
      const remaining = prev.filter(e => e.id !== id);
      if (activeEntryId === id) {
        setActiveEntryId(remaining[0]?.id || null);
      }
      return remaining;
    });
  };

  const handleSubmit = async () => {
    if (entries.length === 0) {
      toast({ title: 'Please select at least one category', variant: 'destructive' }); return;
    }
    const missingDocs = entries.find(e => e.documents.length === 0);
    if (missingDocs) {
      toast({ title: `Please upload at least one bill for: ${missingDocs.head} — ${missingDocs.subHead?.title}`, variant: 'destructive' }); return;
    }
    if (criticalFlags && !overrideWarnings) {
      toast({ title: 'Critical document validation issues found. Please review or override.', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);

    // Step 1: Create the MainClaim (parent)
    const totalAmount = entries.reduce((sum, e) => sum + (parseFloat(e.formData?.amount) || 0), 0);
    const mainClaim = await base44.entities.MainClaim.create({
      claim_number: claimNumber,
      employee_name: user?.full_name,
      employee_email: user?.email,
      department: user?.department,
      expense_date_from: expensePeriod.date_from,
      expense_date_to: expensePeriod.date_to,
      total_amount: totalAmount,
      categories_count: entries.length,
      status: 'submitted',
      payment_mode: paymentDetails.payment_mode,
      payment_reference: paymentDetails.reference_number,
      payment_remarks: paymentDetails.remarks,
      source: 'Manual',
    });

    // Step 2: Create CategoryClaims (children) linked to the MainClaim
    for (const entry of entries) {
      const dates = entry.documents.map(d => d.extractedData?.billDate).filter(Boolean).sort();

      await base44.entities.Claim.create({
        main_claim_id: mainClaim.id,
        main_claim_number: claimNumber,
        claim_number: `${claimNumber}-${entry.subHead.title?.slice(0,3).toUpperCase()}`,
        employee_name: user?.full_name,
        employee_email: user?.email,
        department: user?.department,
        category_id: entry.subHead.id,
        head: entry.head,
        sub_head: entry.subHead.title,
        category_name: `${entry.head} - ${entry.subHead.title}`,
        claim_type: entry.subHead.is_sales_promotion ? 'sales_promotion' : 'normal',
        is_torch_bearer: entry.subHead.is_torch_bearer || false,
        amount: parseFloat(entry.formData?.amount) || 0,
        expense_date_from: expensePeriod.date_from || dates[0] || new Date().toISOString().split('T')[0],
        expense_date_to: expensePeriod.date_to || dates[dates.length - 1] || new Date().toISOString().split('T')[0],
        purpose: entry.formData?.purpose || entry.subHead.title,
        payment_mode: paymentDetails.payment_mode,
        description: paymentDetails.remarks,
        document_urls: entry.documents.map(d => d.fileUrl).filter(Boolean),
        bills: entry.documents.map(doc => ({
          document_url: doc.fileUrl,
          purpose: doc.formData?.purpose || doc.formData?.vendor_name || entry.subHead.title,
          bill_number: doc.formData?.bill_number || doc.extractedData?.billNumber || '',
          bill_date: doc.formData?.bill_date || doc.extractedData?.billDate || '',
          amount: parseFloat(doc.formData?.amount) || parseFloat(doc.extractedData?.totalAmount) || 0,
          currency: doc.extractedData?.currency || 'INR',
          payment_mode: paymentDetails.payment_mode,
          ocr_extracted: !!doc.extractedData,
        })),
        status: 'pending',
        source: 'Manual',
      });
    }

    toast({ title: `Claim ${claimNumber} submitted with ${entries.length} categories!` });
    setIsSubmitting(false);
    navigate('/MyClaims');
  };

  const canSubmit = !isSubmitting && !(criticalFlags && !overrideWarnings);

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-screen bg-gray-50 overflow-hidden">
      {/* Category Sidebar */}
      <ClaimCategorySidebar
        headGroups={headGroups}
        selectedHead={activeEntry?.head || null}
        selectedSubHead={activeEntry?.subHead || null}
        onSelect={handleCategorySelect}
        travelType={travelType}
        onTravelTypeChange={setTravelType}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">New Expense Claim</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{claimNumber}</span>
                {user && <span className="text-sm text-gray-500">{user.full_name}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {totalAmount > 0 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1">
                Total: ₹{totalAmount.toLocaleString('en-IN')}
              </Badge>
            )}
            {entries.length > 0 && (
              <>
                {hasAnyWarnings && !overrideWarnings && !criticalFlags && (
                  <Button variant="outline" size="sm"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setOverrideWarnings(true)}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Proceed with Warnings
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                    : <><Send className="w-4 h-4 mr-2" />Submit {entries.length > 1 ? `${entries.length} Claims` : 'Claim'}</>
                  }
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Entry Pills (multi-category bar) */}
        {entries.length > 0 && (
          <div className="bg-white border-b px-6 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => { setActiveEntryId(entry.id); setActiveTab('form'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  activeEntryId === entry.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {entry.head} — {entry.subHead?.title}
                {entry.documents.length > 0 && (
                  <span className={`ml-1 px-1 rounded text-[10px] font-semibold ${activeEntryId === entry.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {entry.documents.length}
                  </span>
                )}
                <span
                  onClick={(e) => handleRemoveEntry(entry.id, e)}
                  className={`ml-1 rounded-full w-3.5 h-3.5 flex items-center justify-center hover:bg-red-200 hover:text-red-700 ${activeEntryId === entry.id ? 'text-blue-200 hover:text-red-600' : 'text-gray-400'}`}
                >
                  ×
                </span>
              </button>
            ))}
            <button
              onClick={() => { setActiveEntryId(null); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 whitespace-nowrap"
            >
              <Plus className="w-3 h-3" /> Add Category
            </button>
          </div>
        )}

        {/* Body */}
        {entries.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            {!periodSet ? (
              <div className="w-full max-w-md bg-white rounded-xl border shadow-sm p-8 mx-4">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Expense Period</h2>
                  <p className="text-sm text-gray-500 mt-1">Set the period for this claim before selecting categories</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">From Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={expensePeriod.date_from}
                      onChange={e => setExpensePeriod(p => ({ ...p, date_from: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">To Date <span className="text-red-500">*</span></Label>
                    <Input type="date" value={expensePeriod.date_to}
                      onChange={e => setExpensePeriod(p => ({ ...p, date_to: e.target.value }))} className="h-9 text-sm" />
                  </div>
                </div>
                <Button
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                  disabled={!expensePeriod.date_from || !expensePeriod.date_to}
                >
                  <ChevronRight className="w-4 h-4 mr-2" /> Continue to Select Category
                </Button>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="mb-3 text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 inline-block">
                  Period: {expensePeriod.date_from} → {expensePeriod.date_to}
                  <button onClick={() => setExpensePeriod({ date_from: '', date_to: '' })} className="ml-2 text-gray-400 hover:text-red-500">✕</button>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-xl font-semibold text-gray-600">Select a Category</p>
                <p className="text-sm mt-1">Choose a Head and Sub Head from the left panel to begin</p>
                <p className="text-xs text-gray-400 mt-1">You can add multiple categories in one claim</p>
              </div>
            )}
          </div>
        ) : !activeEntry ? (
          // No active entry selected (e.g. after clicking "Add Category")
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-lg font-semibold text-gray-600">Select another category</p>
              <p className="text-sm mt-1">Choose a Sub Head from the left panel to add a new category</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              {/* Sticky stepper bar */}
              <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex-shrink-0">
                <div className="flex items-center gap-0">
                  {[
                    { value: 'documents', num: 1, label: 'Upload Bills', sub: 'Attach & scan docs' },
                    { value: 'form', num: 2, label: 'Claim Details', sub: 'Expense details' },
                    { value: 'payment', num: 3, label: 'Payment Details', sub: 'Mode & reference' },
                    { value: 'review', num: 4, label: 'Review & Submit', sub: 'Confirm & submit' },
                  ].map((step, idx) => {
                    const isActive = activeTab === step.value;
                    const tabOrder = ['documents','form','payment','review'];
                    const isDone = tabOrder.indexOf(activeTab) > idx;
                    return (
                      <React.Fragment key={step.value}>
                        <button
                          onClick={() => setActiveTab(step.value)}
                          className="flex items-center gap-3 group"
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                            isActive ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                            : isDone ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-400'
                          }`}>{step.num}</div>
                          <div className="text-left hidden sm:block">
                            <p className={`text-xs font-semibold leading-tight ${
                              isActive ? 'text-gray-900' : isDone ? 'text-blue-700' : 'text-gray-400'
                            }`}>{step.label}</p>
                            <p className={`text-[10px] leading-tight ${
                              isActive ? 'text-gray-500' : 'text-gray-400'
                            }`}>{step.sub}</p>
                          </div>
                        </button>
                        {idx < 3 && (
                          <div className={`flex-1 mx-3 h-0.5 rounded ${
                            isDone ? 'bg-blue-300' : 'bg-gray-200'
                          }`} style={{minWidth:'24px'}} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable tab content */}
              <div className="flex-1 overflow-auto">
                <TabsContent value="documents" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center p-8">
                    <div className="w-full max-w-3xl space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <p className="font-semibold mb-1">What to upload:</p>
                        <ul className="space-y-0.5 text-xs text-blue-700 list-disc ml-4">
                          <li><strong>Bill:</strong> Original invoice or receipt from the vendor (e.g. restaurant bill, flight ticket, hotel invoice)</li>
                          <li><strong>Receipt:</strong> Payment proof such as UPI screenshot, card slip, or online payment confirmation</li>
                        </ul>
                      </div>
                      <ClaimDocumentOCR
                        key={activeEntry.id}
                        category={activeEntry.subHead}
                        headName={activeEntry.head}
                        documents={activeEntry.documents}
                        onPaymentData={(data) => {
                          setPaymentDetails(prev => ({
                            ...prev,
                            payment_mode: data.payment_mode || prev.payment_mode,
                            reference_number: data.reference_number || prev.reference_number,
                            payment_date: data.payment_date || prev.payment_date,
                          }));
                        }}
                        onChange={(updater) => {
                          setEntries(prev => prev.map(e => {
                            if (e.id !== activeEntryId) return e;
                            const newDocs = typeof updater === 'function' ? updater(e.documents) : updater;
                            return { ...e, documents: newDocs };
                          }));
                        }}
                      />
                      {activeEntry.documents.length > 0 && (
                        <div className="flex justify-end mt-4">
                          <Button onClick={() => setActiveTab('form')} className="bg-blue-600 hover:bg-blue-700">
                            Next: Claim Details <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="form" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center p-8">
                    <ClaimDynamicForm
                      key={activeEntry.id}
                      category={activeEntry.subHead}
                      headName={activeEntry.head}
                      formData={activeEntry.formData}
                      onChange={(fd) => updateActiveEntry({ formData: fd })}
                      documents={activeEntry.documents}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center p-8">
                    <div className="w-full max-w-lg bg-white rounded-xl border shadow-sm p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900 text-base">Payment Details</h3>
                      <p className="text-xs text-gray-500">These payment details apply to all categories in this submission.</p>
                      <div className="space-y-1">
                        <Label>Payment Mode</Label>
                        <Select value={paymentDetails.payment_mode} onValueChange={v => setPaymentDetails(p => ({ ...p, payment_mode: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Cash', 'Card', 'UPI', 'Bank Transfer'].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Reference Number</Label>
                        <Input placeholder="TXN / UTR / Cheque number" value={paymentDetails.reference_number}
                          onChange={e => setPaymentDetails(p => ({ ...p, reference_number: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Payment Date</Label>
                        <Input type="date" value={paymentDetails.payment_date}
                          onChange={e => setPaymentDetails(p => ({ ...p, payment_date: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Remarks</Label>
                        <Input placeholder="Optional notes..." value={paymentDetails.remarks}
                          onChange={e => setPaymentDetails(p => ({ ...p, remarks: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="review" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center pt-6 pb-0">
                    <div className="w-full max-w-3xl bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-3 text-sm text-blue-800">
                      <span className="font-semibold">Expense Period:</span>
                      <span>{expensePeriod.date_from} → {expensePeriod.date_to}</span>
                    </div>
                  </div>
                  {entries.some(e => e.subHead?.policy_limit && parseFloat(e.formData?.amount) > e.subHead.policy_limit) && (
                    <div className="flex justify-center pt-3">
                      <div className="w-full max-w-3xl space-y-2">
                        {entries.filter(e => e.subHead?.policy_limit && parseFloat(e.formData?.amount) > e.subHead.policy_limit).map(e => (
                          <div key={e.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span><strong>{e.head} — {e.subHead.title}:</strong> Amount ₹{parseFloat(e.formData.amount).toLocaleString('en-IN')} exceeds policy limit of ₹{e.subHead.policy_limit.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <ClaimReviewPanel entries={entries} paymentDetails={paymentDetails} user={user} />
                  <div className="flex justify-center pb-10">
                    <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="bg-blue-600 hover:bg-blue-700 px-10">
                      {isSubmitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                        : <><Send className="w-4 h-4 mr-2" />Submit {entries.length > 1 ? `${entries.length} Claims` : 'Claim'}</>
                      }
                    </Button>
                  </div>
                </TabsContent>

              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}