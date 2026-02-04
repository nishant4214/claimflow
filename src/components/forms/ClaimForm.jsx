import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from 'date-fns';
import { 
  CalendarIcon, Upload, FileText, AlertCircle, 
  Loader2, CheckCircle, X, IndianRupee, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer'];

export default function ClaimForm({ user, onSubmit, initialData, isLoading, isEditing = false }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialData || {
    employee_name: user?.full_name || '',
    employee_email: user?.email || '',
    department: user?.department || '',
    designation: user?.designation || '',
    expense_date: '',
    purpose: '',
    bill_number: '',
    bill_date: '',
    amount: '',
    payment_mode: '',
    category_id: '',
    category_name: '',
    description: '',
    document_urls: [],
    claim_type: 'normal',
    is_torch_bearer: user?.is_torch_bearer || false,
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploadedUrls = [...formData.document_urls];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type`);
        continue;
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setFormData(prev => ({ ...prev, document_urls: uploadedUrls }));
    setUploadingFiles(false);
    toast.success('Files uploaded successfully');
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      document_urls: prev.document_urls.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (stepNum) => {
    const newErrors = {};
    
    if (stepNum === 1) {
      if (!formData.expense_date) newErrors.expense_date = 'Required';
      if (!formData.purpose) newErrors.purpose = 'Required';
      if (!formData.category_id) newErrors.category_id = 'Required';
    }
    
    if (stepNum === 2) {
      if (!formData.bill_number) newErrors.bill_number = 'Required';
      if (!formData.bill_date) newErrors.bill_date = 'Required';
      if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount required';
      if (!formData.payment_mode) newErrors.payment_mode = 'Required';
    }
    
    if (stepNum === 3) {
      if (selectedCategory?.bill_required && formData.document_urls.length === 0) {
        newErrors.document_urls = 'Bill document is required for this category';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = () => {
    if (validateStep(3)) {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        status: 'submitted',
        current_approver_role: formData.claim_type === 'sales_promotion' ? 'manager' : 'junior_admin',
      };

      // Only set these for new claims
      if (!isEditing) {
        submitData.sla_date = format(addDays(new Date(), 45), 'yyyy-MM-dd');
        submitData.claim_number = `CLM-${Date.now().toString(36).toUpperCase()}`;
      }

      onSubmit(submitData);
    }
  };

  const saveDraft = () => {
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      status: 'draft',
    });
  };

  const steps = [
    { num: 1, title: 'Basic Info', subtitle: 'Expense details' },
    { num: 2, title: 'Bill Details', subtitle: 'Payment info' },
    { num: 3, title: 'Documents', subtitle: 'Upload & review' },
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
                  step >= s.num 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-500 hidden sm:block">{s.subtitle}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-300 ${
                  step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Expense Information</CardTitle>
                <CardDescription>Enter the basic details of your expense claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Employee Info (Read-only) */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-500">Employee Name</Label>
                    <p className="font-medium">{formData.employee_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Department</Label>
                    <p className="font-medium">{formData.department || 'Not set'}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expense Date <span className="text-red-500">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={`w-full justify-start text-left font-normal ${
                            errors.expense_date ? 'border-red-500' : ''
                          }`}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expense_date 
                              ? format(new Date(formData.expense_date), 'PPP')
                              : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.expense_date ? new Date(formData.expense_date) : undefined}
                            onSelect={(date) => handleChange('expense_date', date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.expense_date && (
                        <p className="text-xs text-red-500">{errors.expense_date}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Category <span className="text-red-500">*</span></Label>
                      <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                        <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedCategories).map(([group, cats]) => (
                            <React.Fragment key={group}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                                {group}
                              </div>
                              {cats.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{cat.title}</span>
                                    {cat.policy_limit && (
                                      <span className="text-xs text-gray-400 ml-2">
                                        ≤ ₹{cat.policy_limit.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category_id && (
                        <p className="text-xs text-red-500">{errors.category_id}</p>
                      )}
                    </div>
                  </div>

                  {selectedCategory && (
                    <div className={`p-4 rounded-lg border ${
                      selectedCategory.is_sales_promotion 
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Info className={`w-5 h-5 mt-0.5 ${
                          selectedCategory.is_sales_promotion ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                        <div className="text-sm">
                          <p className="font-medium">
                            {selectedCategory.is_sales_promotion 
                              ? 'Sales Promotion Claim' 
                              : 'Normal Reimbursement'}
                          </p>
                          <p className="text-gray-600 mt-1">{selectedCategory.description}</p>
                          <div className="flex gap-4 mt-2">
                            {selectedCategory.policy_limit && (
                              <span className="text-xs">
                                Policy Limit: ₹{selectedCategory.policy_limit.toLocaleString()}
                              </span>
                            )}
                            <span className="text-xs">
                              Bill Required: {selectedCategory.bill_required ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Purpose of Expense <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Brief description of the expense"
                      value={formData.purpose}
                      onChange={(e) => handleChange('purpose', e.target.value)}
                      className={errors.purpose ? 'border-red-500' : ''}
                    />
                    {errors.purpose && (
                      <p className="text-xs text-red-500">{errors.purpose}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Detailed Description</Label>
                    <Textarea
                      placeholder="Additional details about the expense..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Bill Details */}
          {step === 2 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Bill & Payment Details</CardTitle>
                <CardDescription>Enter the bill and payment information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bill Number <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="Enter bill/invoice number"
                      value={formData.bill_number}
                      onChange={(e) => handleChange('bill_number', e.target.value)}
                      className={errors.bill_number ? 'border-red-500' : ''}
                    />
                    {errors.bill_number && (
                      <p className="text-xs text-red-500">{errors.bill_number}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Bill Date <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={`w-full justify-start text-left font-normal ${
                          errors.bill_date ? 'border-red-500' : ''
                        }`}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.bill_date 
                            ? format(new Date(formData.bill_date), 'PPP')
                            : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.bill_date ? new Date(formData.bill_date) : undefined}
                          onSelect={(date) => handleChange('bill_date', date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.bill_date && (
                      <p className="text-xs text-red-500">{errors.bill_date}</p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₹) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-xs text-red-500">{errors.amount}</p>
                    )}
                    {selectedCategory?.policy_limit && formData.amount > selectedCategory.policy_limit && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Amount exceeds policy limit of ₹{selectedCategory.policy_limit.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Mode <span className="text-red-500">*</span></Label>
                    <Select value={formData.payment_mode} onValueChange={(v) => handleChange('payment_mode', v)}>
                      <SelectTrigger className={errors.payment_mode ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map(mode => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.payment_mode && (
                      <p className="text-xs text-red-500">{errors.payment_mode}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Documents & Review */}
          {step === 3 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload supporting documents (PDF, JPG, PNG - Max 5MB each)
                  {selectedCategory?.bill_required && (
                    <span className="text-red-500 ml-1">* Bill required</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    errors.document_urls 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {uploadingFiles ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                        <p className="text-sm text-gray-600">Uploading files...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, JPG, PNG up to 5MB each
                        </p>
                      </div>
                    )}
                  </label>
                </div>
                {errors.document_urls && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.document_urls}
                  </p>
                )}

                {formData.document_urls.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files</Label>
                    <div className="space-y-2">
                      {formData.document_urls.map((url, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm truncate max-w-xs">
                              Document {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-4">Claim Summary</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium">{formData.category_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Purpose</p>
                      <p className="font-medium">{formData.purpose}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold text-lg">₹{parseFloat(formData.amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expense Date</p>
                      <p className="font-medium">
                        {formData.expense_date && format(new Date(formData.expense_date), 'PPP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Claim Type</p>
                      <p className={`font-medium ${
                        formData.claim_type === 'sales_promotion' ? 'text-purple-600' : 'text-blue-600'
                      }`}>
                        {formData.claim_type === 'sales_promotion' ? 'Sales Promotion' : 'Normal Reimbursement'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Documents</p>
                      <p className="font-medium">{formData.document_urls.length} file(s)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={prevStep}>
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={saveDraft} disabled={isLoading}>
            Save Draft
          </Button>
          {step < 3 ? (
            <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Resubmitting...' : 'Submitting...'}
                </>
              ) : (
                isEditing ? 'Resubmit Claim' : 'Submit Claim'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}