import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, Send, Loader2, FileText, Upload, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ClaimCategorySidebar from '@/components/claims/ClaimCategorySidebar';
import ClaimDynamicForm from '@/components/claims/ClaimDynamicForm';
import ClaimDocumentOCR from '@/components/claims/ClaimDocumentOCR';

export default function NewClaim() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedHead, setSelectedHead] = useState(null);
  const [selectedSubHead, setSelectedSubHead] = useState(null);
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_mode: 'Cash',
    reference_number: '',
    payment_date: '',
    remarks: ''
  });
  const [activeTab, setActiveTab] = useState('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideWarnings, setOverrideWarnings] = useState(false);
  const [travelType, setTravelType] = useState('Domestic');

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

  const totalAmount = documents.reduce((sum, doc) => sum + (parseFloat(doc.formData?.amount) || 0), 0);

  const criticalFlags = documents.some(doc =>
    (doc.validation?.authenticityScore || 100) < 50 ||
    doc.validation?.flags?.includes('INVALID_STRUCTURE') ||
    doc.validation?.flags?.includes('POSSIBLE_FAKE')
  );

  const hasAnyWarnings = documents.some(doc => doc.validation?.flags?.length > 0);

  const handleCategorySelect = (head, subHead) => {
    setSelectedHead(head);
    setSelectedSubHead(subHead);
    setFormData({});
    setDocuments([]);
    setOverrideWarnings(false);
    setActiveTab('form');
  };

  const handleSubmit = async () => {
    if (!selectedSubHead) {
      toast({ title: 'Please select a category', variant: 'destructive' }); return;
    }
    if (documents.length === 0) {
      toast({ title: 'Please upload at least one bill', variant: 'destructive' }); return;
    }
    if (criticalFlags && !overrideWarnings) {
      toast({ title: 'Critical validation issues found. Please review documents or override.', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);
    const claimNumber = `CLM-${Date.now()}`;
    const dates = documents.map(d => d.formData?.bill_date).filter(Boolean).sort();

    await base44.entities.Claim.create({
      claim_number: claimNumber,
      employee_name: user?.full_name,
      employee_email: user?.email,
      department: user?.department,
      category_id: selectedSubHead.id,
      category_name: `${selectedHead} - ${selectedSubHead.title}`,
      claim_type: selectedSubHead.is_sales_promotion ? 'sales_promotion' : 'normal',
      is_torch_bearer: selectedSubHead.is_torch_bearer || false,
      amount: totalAmount,
      expense_date_from: formData.date_from || dates[0] || new Date().toISOString().split('T')[0],
      expense_date_to: formData.date_to || dates[dates.length - 1] || new Date().toISOString().split('T')[0],
      purpose: formData.purpose || selectedSubHead.title,
      payment_mode: paymentDetails.payment_mode,
      description: paymentDetails.remarks,
      document_urls: documents.map(d => d.fileUrl).filter(Boolean),
      bills: documents.map(doc => ({
        document_url: doc.fileUrl,
        purpose: doc.formData?.purpose || doc.formData?.vendor_name || selectedSubHead.title,
        bill_number: doc.formData?.bill_number || doc.extractedData?.billNumber || '',
        bill_date: doc.formData?.bill_date || doc.extractedData?.billDate || '',
        amount: parseFloat(doc.formData?.amount) || parseFloat(doc.extractedData?.totalAmount) || 0,
        currency: doc.formData?.currency || doc.extractedData?.currency || 'INR',
        payment_mode: paymentDetails.payment_mode,
        ocr_extracted: !!doc.extractedData,
      })),
      status: 'submitted',
      source: 'Manual'
    });

    toast({ title: 'Claim submitted successfully!' });
    setIsSubmitting(false);
    navigate('/MyClaims');
  };

  const canSubmit = !isSubmitting && !(criticalFlags && !overrideWarnings);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ClaimCategorySidebar
        headGroups={headGroups}
        selectedHead={selectedHead}
        selectedSubHead={selectedSubHead}
        onSelect={handleCategorySelect}
        travelType={travelType}
        onTravelTypeChange={setTravelType}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {selectedSubHead ? `${selectedHead} — ${selectedSubHead.title}` : 'New Expense Claim'}
              </h1>
              {user && <p className="text-sm text-gray-500">{user.full_name} · {user.email}</p>}
            </div>
          </div>

          {selectedSubHead && (
            <div className="flex items-center gap-3">
              {totalAmount > 0 && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-sm px-3 py-1">
                  Total: ₹{totalAmount.toLocaleString('en-IN')}
                </Badge>
              )}
              {hasAnyWarnings && !overrideWarnings && !criticalFlags && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => setOverrideWarnings(true)}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Proceed with Warnings
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Submit Claim</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Body */}
        {!selectedSubHead ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-xl font-semibold text-gray-600">Select a Category</p>
              <p className="text-sm mt-1">Choose a Head and Sub Head from the left panel to begin</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              {/* Sticky tab bar */}
              <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex-shrink-0">
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="form" className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Claim Details
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Upload Bills
                    {documents.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">{documents.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Payment Details
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable tab content */}
              <div className="flex-1 overflow-auto">
                <TabsContent value="form" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center p-8">
                    <ClaimDynamicForm
                      category={selectedSubHead}
                      headName={selectedHead}
                      formData={formData}
                      onChange={setFormData}
                      documents={documents}
                    />
                  </div>
                </TabsContent>

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
                        category={selectedSubHead}
                        headName={selectedHead}
                        documents={documents}
                        onChange={setDocuments}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0 animate-in fade-in-0 duration-200">
                  <div className="flex justify-center p-8">
                    <div className="w-full max-w-lg bg-white rounded-xl border shadow-sm p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900 text-base">Payment Details</h3>
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
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}