import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft, FileText, Calendar, IndianRupee, Tag,
  ChevronDown, ChevronUp, CheckCircle, XCircle, RotateCcw,
  Eye, AlertTriangle, Send, Loader2, Building, User
} from "lucide-react";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MAIN_STATUS_CONFIG = {
  draft:              { label: 'Draft',              color: 'bg-gray-100 text-gray-700 border-gray-300' },
  submitted:          { label: 'Submitted',          color: 'bg-blue-100 text-blue-700 border-blue-300' },
  partially_approved: { label: 'Partially Approved', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  approved:           { label: 'Approved',           color: 'bg-green-100 text-green-700 border-green-300' },
  rejected:           { label: 'Rejected',           color: 'bg-red-100 text-red-700 border-red-300' },
};

const CAT_STATUS_CONFIG = {
  pending:          { label: 'Pending',         color: 'bg-blue-100 text-blue-700' },
  verified:         { label: 'Verified',         color: 'bg-teal-100 text-teal-700' },
  manager_approved: { label: 'Mgr Approved',    color: 'bg-indigo-100 text-indigo-700' },
  admin_approved:   { label: 'Admin Approved',  color: 'bg-indigo-100 text-indigo-700' },
  approved:         { label: 'Approved',         color: 'bg-green-100 text-green-700' },
  rejected:         { label: 'Rejected',         color: 'bg-red-100 text-red-700' },
  sent_back:        { label: 'Sent Back',        color: 'bg-amber-100 text-amber-700' },
};

// Which statuses an approver role can act on
const ROLE_CAN_ACT = {
  junior_admin: ['pending', 'submitted'],
  manager:      ['verified', 'submitted'],
  admin_head:   ['manager_approved'],
  cro:          ['manager_approved'],
  cfo:          ['cro_approved'],
};

const ROLE_NEXT_STATUS = {
  junior_admin: 'verified',
  manager:      'manager_approved',
  admin_head:   'admin_approved',
  cro:          'cro_approved',
  cfo:          'approved',
};

function computeMainStatus(categoryStatuses) {
  if (categoryStatuses.length === 0) return 'submitted';
  const actionable = ['pending', 'submitted', 'verified', 'manager_approved', 'admin_approved', 'cro_approved'];
  const allApproved = categoryStatuses.every(s => s === 'approved' || s === 'admin_approved' || s === 'cfo_approved');
  const allRejected = categoryStatuses.every(s => s === 'rejected');
  const anyPending = categoryStatuses.some(s => actionable.includes(s));
  const anySentBack = categoryStatuses.some(s => s === 'sent_back');
  if (allApproved) return 'approved';
  if (allRejected) return 'rejected';
  if (anyPending || anySentBack) return 'partially_approved';
  return 'partially_approved';
}

function CategoryClaimCard({ cat, userRole, onAction, isApprover }) {
  const [expanded, setExpanded] = useState(false);
  const [actionMode, setActionMode] = useState(null); // 'reject' | 'send_back'
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  const cfg = CAT_STATUS_CONFIG[cat.status] || CAT_STATUS_CONFIG.pending;
  const canActStatuses = ROLE_CAN_ACT[userRole] || [];
  const canAct = isApprover && canActStatuses.includes(cat.status);

  const handleAction = async (action) => {
    if ((action === 'reject' || action === 'send_back') && !remarks.trim()) return;
    setLoading(true);
    await onAction(cat, action, remarks);
    setActionMode(null);
    setRemarks('');
    setLoading(false);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      cat.status === 'rejected' ? 'border-red-200 bg-red-50/30'
      : cat.status === 'approved' || cat.status === 'admin_approved' ? 'border-green-200 bg-green-50/30'
      : cat.status === 'sent_back' ? 'border-amber-200 bg-amber-50/30'
      : 'border-gray-200 bg-white'
    }`}>
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{cat.category_name || `${cat.head} — ${cat.sub_head}`}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
              <span className="text-xs text-gray-500">₹{(cat.amount || 0).toLocaleString('en-IN')}</span>
              {cat.document_urls?.length > 0 && (
                <span className="text-xs text-gray-400">{cat.document_urls.length} doc{cat.document_urls.length > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canAct && (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="outline"
                className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => handleAction('approve')}
                disabled={loading}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline"
                className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setActionMode(actionMode === 'send_back' ? null : 'send_back')}
                disabled={loading}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Send Back
              </Button>
              <Button size="sm" variant="outline"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setActionMode(actionMode === 'reject' ? null : 'reject')}
                disabled={loading}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Remarks Form (reject/send_back) */}
      <AnimatePresence>
        {actionMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`px-4 pb-3 ${actionMode === 'reject' ? 'bg-red-50 border-t border-red-100' : 'bg-amber-50 border-t border-amber-100'}`}
          >
            <p className="text-xs font-semibold mt-3 mb-1.5 text-gray-700">
              {actionMode === 'reject' ? 'Rejection reason *' : 'Send back reason *'}
            </p>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={actionMode === 'reject' ? 'Why is this category being rejected?' : 'What needs to be corrected?'}
              rows={2}
              className="text-xs mb-2"
            />
            <div className="flex gap-2">
              <Button size="sm" className={`text-xs h-7 ${actionMode === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                disabled={!remarks.trim() || loading}
                onClick={() => handleAction(actionMode)}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (actionMode === 'reject' ? 'Confirm Reject' : 'Confirm Send Back')}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setActionMode(null); setRemarks(''); }}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection/Send Back reason display */}
      {cat.rejection_reason && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700">
          <span className="font-semibold">Rejection reason:</span> {cat.rejection_reason}
        </div>
      )}
      {cat.send_back_reason && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
          <span className="font-semibold">Sent back reason:</span> {cat.send_back_reason}
        </div>
      )}

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 space-y-3">
              {cat.purpose && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Purpose</p>
                  <p className="text-sm text-gray-700">{cat.purpose}</p>
                </div>
              )}
              {cat.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Remarks</p>
                  <p className="text-sm text-gray-700">{cat.description}</p>
                </div>
              )}
              {/* Documents */}
              {cat.document_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Documents ({cat.document_urls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {cat.document_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Doc {i + 1}
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Bills */}
              {cat.bills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Bill Details</p>
                  <div className="space-y-2">
                    {cat.bills.map((bill, i) => (
                      <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800">{bill.purpose || `Bill ${i+1}`}</span>
                          <span className="text-sm font-bold text-gray-900">₹{(bill.amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                          {bill.bill_number && (
                            <span><span className="font-medium text-gray-600">Bill #:</span> {bill.bill_number}</span>
                          )}
                          {bill.bill_date && (
                            <span><span className="font-medium text-gray-600">Date:</span> {bill.bill_date}</span>
                          )}
                          {bill.payment_mode && (
                            <span><span className="font-medium text-gray-600">Payment:</span> {bill.payment_mode}</span>
                          )}
                          {bill.currency && bill.currency !== 'INR' && (
                            <span><span className="font-medium text-gray-600">Currency:</span> {bill.currency}</span>
                          )}
                        </div>
                        {bill.ocr_extracted && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded mt-1.5">
                            ✓ OCR Extracted
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Payment Details */}
              {(cat.payment_mode || cat.payment_reference || cat.bill_number || cat.bill_date) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Payment Details</p>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {cat.payment_mode && (
                      <span><span className="font-medium text-gray-600">Mode:</span> {cat.payment_mode}</span>
                    )}
                    {cat.bill_number && (
                      <span><span className="font-medium text-gray-600">Bill #:</span> {cat.bill_number}</span>
                    )}
                    {cat.bill_date && (
                      <span><span className="font-medium text-gray-600">Bill Date:</span> {cat.bill_date}</span>
                    )}
                    {cat.payment_reference && (
                      <span><span className="font-medium text-gray-600">Ref:</span> {cat.payment_reference}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MainClaimDetails() {
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const mainClaimId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';
  const isApprover = ['junior_admin', 'manager', 'admin_head', 'cro', 'cfo', 'admin'].includes(userRole);

  const { data: mainClaim, isLoading: loadingMain } = useQuery({
    queryKey: ['main-claim', mainClaimId],
    queryFn: async () => {
      const res = await base44.entities.MainClaim.filter({ id: mainClaimId });
      return res[0];
    },
    enabled: !!mainClaimId,
  });

  const { data: categoryClaims = [], isLoading: loadingCats } = useQuery({
    queryKey: ['category-claims', mainClaimId],
    queryFn: () => base44.entities.Claim.filter({ main_claim_id: mainClaimId }, 'created_date'),
    enabled: !!mainClaimId,
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['category-claims', mainClaimId]),
  });

  const updateMainClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MainClaim.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['main-claim', mainClaimId]),
  });

  const handleCategoryAction = async (cat, action, remarks) => {
    const nextStatusMap = {
      approve: ROLE_NEXT_STATUS[userRole] || 'approved',
      reject: 'rejected',
      send_back: 'sent_back',
    };
    const newStatus = nextStatusMap[action];

    await updateClaimMutation.mutateAsync({
      id: cat.id,
      data: {
        status: newStatus,
        ...(action === 'reject' && { rejection_reason: remarks }),
        ...(action === 'send_back' && { send_back_reason: remarks }),
      }
    });

    // Re-fetch categories to compute new main claim status
    const updatedCats = await base44.entities.Claim.filter({ main_claim_id: mainClaimId });
    const statuses = updatedCats.map(c => (c.id === cat.id ? newStatus : c.status));
    const newMainStatus = computeMainStatus(statuses);

    await updateMainClaimMutation.mutateAsync({
      id: mainClaimId,
      data: { status: newMainStatus }
    });

    // Notify employee
    await base44.integrations.Core.SendEmail({
      to: cat.employee_email,
      subject: action === 'approve'
        ? `Category Claim Approved — ${mainClaim?.claim_number}`
        : action === 'reject'
        ? `Category Claim Rejected — ${mainClaim?.claim_number}`
        : `Category Claim Sent Back — ${mainClaim?.claim_number}`,
      body: `Dear ${cat.employee_name},\n\nYour ${cat.category_name} under claim ${mainClaim?.claim_number} has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for correction'} by ${user.full_name}.\n\n${remarks ? 'Reason: ' + remarks : ''}\n\nBest regards,\nClaim Management System`,
    });

    toast.success(
      action === 'approve' ? 'Category approved' :
      action === 'reject' ? 'Category rejected' : 'Sent back for correction'
    );

    queryClient.invalidateQueries(['category-claims', mainClaimId]);
    queryClient.invalidateQueries(['main-claim', mainClaimId]);
  };

  if (loadingMain || !mainClaim) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const mainCfg = MAIN_STATUS_CONFIG[mainClaim.status] || MAIN_STATUS_CONFIG.submitted;
  const totalAmount = categoryClaims.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" className="-ml-2 text-gray-600 mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold font-mono text-gray-900">{mainClaim.claim_number}</h1>
                <Badge variant="outline" className={`${mainCfg.color} text-sm`}>{mainCfg.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> {mainClaim.employee_name}
                </span>
                {mainClaim.department && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> {mainClaim.department}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {mainClaim.expense_date_from && format(parseISO(mainClaim.expense_date_from), 'dd MMM yyyy')}
                  {mainClaim.expense_date_to && ` → ${format(parseISO(mainClaim.expense_date_to), 'dd MMM yyyy')}`}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <IndianRupee className="w-5 h-5 text-gray-600" />
                <span className="text-3xl font-bold text-gray-900">{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{categoryClaims.length} categories</p>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pending', statuses: ['pending', 'submitted', 'verified', 'manager_approved', 'admin_approved', 'cro_approved'], color: 'text-blue-600 bg-blue-50' },
            { label: 'Approved', statuses: ['approved'], color: 'text-green-600 bg-green-50' },
            { label: 'Rejected', statuses: ['rejected'], color: 'text-red-600 bg-red-50' },
            { label: 'Sent Back', statuses: ['sent_back'], color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, statuses, color }) => {
            const count = categoryClaims.filter(c => statuses.includes(c.status)).length;
            return (
              <div key={label} className={`rounded-xl p-3 ${color} flex items-center justify-between`}>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xl font-bold">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Approver note */}
        {isApprover && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-blue-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>You can approve, reject, or send back each category independently below.</span>
          </div>
        )}

        {/* Category Claims */}
        <div className="space-y-3">
          {loadingCats ? (
            [1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)
          ) : categoryClaims.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No categories found for this claim.</p>
            </div>
          ) : (
            categoryClaims.map(cat => (
              <CategoryClaimCard
                key={cat.id}
                cat={cat}
                userRole={userRole}
                isApprover={isApprover}
                onAction={handleCategoryAction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}