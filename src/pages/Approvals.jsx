import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Search, CheckCircle, XCircle, ArrowLeft, Eye, Clock,
  AlertCircle, IndianRupee, ChevronDown, ChevronUp, Tag, Car, Calendar
} from "lucide-react";
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ApprovalActionModal from '../components/approvals/ApprovalActionModal';
import { logCriticalAction } from '../components/session/SessionLogger';
import TransportApprovalRows from '../components/transport/TransportApprovalRows';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from 'framer-motion';
import SLAIndicator from '../components/claims/SLAIndicator';

// Which statuses trigger each role to act
const ROLE_STAGES = {
  junior_admin: { statuses: ['pending', 'submitted'], nextStatus: 'verified', stage: 'verification' },
  manager:      { statuses: ['verified', 'submitted'], nextStatus: 'manager_approved', stage: 'manager_approval' },
  admin_head:   { statuses: ['manager_approved'], nextStatus: 'admin_approved', stage: 'admin_approval' },
  cro:          { statuses: ['manager_approved'], nextStatus: 'cro_approved', stage: 'cro_approval' },
  cfo:          { statuses: ['cro_approved'], nextStatus: 'approved', stage: 'cfo_approval' },
};

const TRANSPORT_APPROVER_ROLES = ['manager', 'admin_head', 'admin'];

function computeMainStatus(categoryStatuses) {
  if (categoryStatuses.length === 0) return 'submitted';
  const terminalApproved = ['approved', 'admin_approved', 'cfo_approved'];
  if (categoryStatuses.every(s => terminalApproved.includes(s))) return 'approved';
  if (categoryStatuses.every(s => s === 'rejected')) return 'rejected';
  return 'partially_approved';
}

function GroupedClaimRow({ group, userRole, roleConfig, onCategoryAction, isProcessed }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const totalAmount = group.categories.reduce((s, c) => s + (c.amount || 0), 0);
  const pendingCount = group.categories.filter(c => roleConfig?.statuses?.includes(c.status)).length;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <span className="font-mono text-sm font-bold text-gray-900">{group.main_claim_number}</span>
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium text-sm">{group.employee_name}</p>
            <p className="text-xs text-gray-500">{group.department}</p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 flex-wrap">
            {group.categories.map(c => (
              <Badge key={c.id} variant="outline" className="text-xs">
                {c.category_name?.split(' - ')[1] || c.sub_head || c.category_name}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="font-semibold text-sm">
          ₹{totalAmount.toLocaleString('en-IN')}
        </TableCell>
        <TableCell>
          {pendingCount > 0 && !isProcessed && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              {pendingCount} pending
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={e => { e.stopPropagation(); navigate(`/MainClaimDetails?id=${group.main_claim_id}`); }}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Full View
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </TableCell>
      </motion.tr>

      {/* Expanded category rows */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={6} className="p-0 border-b bg-gray-50">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 py-3 space-y-2"
              >
                {group.categories.map(cat => {
                  const canAct = !isProcessed && roleConfig?.statuses?.includes(cat.status);
                  return (
                    <div key={cat.id} className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${
                      cat.status === 'rejected' ? 'bg-red-50 border-red-200'
                      : cat.status === 'approved' || cat.status === 'admin_approved' ? 'bg-green-50 border-green-200'
                      : cat.status === 'sent_back' ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{cat.category_name}</p>
                          <p className="text-xs text-gray-500">₹{(cat.amount || 0).toLocaleString('en-IN')} · {cat.purpose}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${
                          cat.status === 'rejected' ? 'bg-red-100 text-red-700'
                          : cat.status === 'approved' || cat.status === 'admin_approved' ? 'bg-green-100 text-green-700'
                          : cat.status === 'sent_back' ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}>{cat.status?.replace('_', ' ')}</Badge>
                        {canAct && (
                          <>
                            <Button size="sm" variant="outline"
                              className="h-6 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => onCategoryAction(cat, 'approve', '')}>
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-6 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => onCategoryAction(cat, 'send_back', null)}>
                              <ArrowLeft className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-6 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => onCategoryAction(cat, 'reject', null)}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Approvals() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pending');
  const [pendingAction, setPendingAction] = useState(null); // { cat, action }
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [transportActionType, setTransportActionType] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const userRole = user?.portal_role || 'employee';
  const roleConfig = ROLE_STAGES[userRole];
  const canApproveTransport = TRANSPORT_APPROVER_ROLES.includes(userRole);

  const { data: allClaims = [], isLoading } = useQuery({
    queryKey: ['all-category-claims', userRole],
    queryFn: () => base44.entities.Claim.filter({ main_claim_id: { $exists: true } }, '-created_date'),
    enabled: !!user && !!roleConfig,
  });

  const { data: allTransportRequests = [], refetch: refetchTransport } = useQuery({
    queryKey: ['transport-approvals', userRole],
    queryFn: () => base44.entities.TransportRequest.list('-created_date'),
    enabled: !!user && canApproveTransport,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!canApproveTransport) return;
    const unsubscribe = base44.entities.TransportRequest.subscribe(() => refetchTransport());
    return () => unsubscribe();
  }, [canApproveTransport]);

  const pendingTransportRequests = allTransportRequests.filter(req => {
    if (userRole === 'manager') return req.status === 'pending_manager' && req.stage === 'manager';
    if (userRole === 'admin_head') return req.status === 'pending_lead' && req.stage === 'lead';
    if (userRole === 'admin') return req.status === 'pending_manager' || req.status === 'pending_lead';
    return false;
  });

  const processedTransportRequests = allTransportRequests.filter(req =>
    ['approved', 'rejected', 'sent_back'].includes(req.status)
  );

  const updateTransportMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransportRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transport-approvals']);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  const handleTransportAction = async (req, action, remarks = '') => {
    let newStatus, newStage, historyAction;
    if (action === 'approve') {
      if (req.stage === 'manager') { newStatus = 'pending_lead'; newStage = 'lead'; historyAction = 'manager_approved'; }
      else { newStatus = 'approved'; newStage = 'completed'; historyAction = 'lead_approved'; }
    } else if (action === 'reject') {
      newStatus = 'rejected'; newStage = 'completed';
      historyAction = req.stage === 'manager' ? 'manager_rejected' : 'lead_rejected';
    } else {
      newStatus = 'sent_back'; newStage = req.stage;
      historyAction = req.stage === 'manager' ? 'manager_sent_back' : 'lead_sent_back';
    }
    const newHistoryEntry = { action: historyAction, by_name: user.full_name, by_email: user.email, by_role: userRole, remarks: remarks || action, timestamp: new Date().toISOString() };
    await updateTransportMutation.mutateAsync({ id: req.id, data: { status: newStatus, stage: newStage, history: [...(req.history || []), newHistoryEntry], ...(action === 'reject' && { rejection_reason: remarks }), ...(action === 'send_back' && { send_back_reason: remarks }) } });
    await base44.integrations.Core.SendEmail({ to: req.employee_email, subject: `Transport Request ${req.tar_number} - ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Sent Back'}`, body: `Dear ${req.employee_name},\n\nYour transport request ${req.tar_number} has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back'}.\n\n${remarks ? 'Reason: ' + remarks : ''}\n\nBest regards,\nClaim Management System` });
    toast.success(action === 'approve' ? 'Transport request approved' : action === 'reject' ? 'Transport request rejected' : 'Sent back');
    setSelectedTransport(null); setTransportActionType(null);
  };

  // Group claims by main_claim_id
  const buildGroups = (claims) => {
    const map = {};
    claims.forEach(claim => {
      const key = claim.main_claim_id;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          main_claim_id: claim.main_claim_id,
          main_claim_number: claim.main_claim_number || key,
          employee_name: claim.employee_name,
          employee_email: claim.employee_email,
          department: claim.department,
          categories: [],
        };
      }
      map[key].categories.push(claim);
    });
    return Object.values(map);
  };

  const pendingClaims = allClaims.filter(c => roleConfig?.statuses?.includes(c.status));
  const processedClaims = allClaims.filter(c =>
    !roleConfig?.statuses?.includes(c.status) && !['draft'].includes(c.status)
  );

  const displayedClaims = tab === 'pending' ? pendingClaims : processedClaims;
  const filteredClaims = displayedClaims.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.main_claim_number?.toLowerCase().includes(s) || c.employee_name?.toLowerCase().includes(s);
  });

  const claimGroups = buildGroups(filteredClaims);

  const displayedTransport = tab === 'pending' ? pendingTransportRequests : processedTransportRequests;
  const filteredTransport = displayedTransport.filter(req => {
    if (!search) return true;
    const s = search.toLowerCase();
    return req.tar_number?.toLowerCase().includes(s) || req.employee_name?.toLowerCase().includes(s);
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['all-category-claims', userRole]),
  });

  const updateMainClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MainClaim.update(id, data),
  });

  const handleCategoryAction = async (cat, action, remarks) => {
    // If remarks is null, need to prompt (handled by pendingAction modal)
    if (remarks === null && (action === 'reject' || action === 'send_back')) {
      setPendingAction({ cat, action });
      return;
    }

    const nextStatus = action === 'approve' ? (ROLE_STAGES[userRole]?.nextStatus || 'approved')
      : action === 'reject' ? 'rejected' : 'sent_back';

    await updateClaimMutation.mutateAsync({
      id: cat.id,
      data: {
        status: nextStatus,
        ...(action === 'reject' && { rejection_reason: remarks }),
        ...(action === 'send_back' && { send_back_reason: remarks }),
      }
    });

    // Re-aggregate main claim status
    const allCatsForMain = await base44.entities.Claim.filter({ main_claim_id: cat.main_claim_id });
    const statuses = allCatsForMain.map(c => (c.id === cat.id ? nextStatus : c.status));
    const newMainStatus = computeMainStatus(statuses);
    await updateMainClaimMutation.mutateAsync({ id: cat.main_claim_id, data: { status: newMainStatus } });

    await base44.integrations.Core.SendEmail({
      to: cat.employee_email,
      subject: `Category ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Sent Back'} — ${cat.main_claim_number}`,
      body: `Dear ${cat.employee_name},\n\nYour ${cat.category_name} under claim ${cat.main_claim_number} has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back'} by ${user.full_name}.\n\n${remarks ? 'Reason: ' + remarks : ''}\n\nBest regards,\nClaim Management System`,
    });

    toast.success(action === 'approve' ? 'Category approved' : action === 'reject' ? 'Category rejected' : 'Sent back for correction');
    logCriticalAction('Approvals', action, cat.main_claim_number);
    queryClient.invalidateQueries(['all-category-claims', userRole]);
  };

  const handleModalConfirm = async (remarks) => {
    if (!pendingAction) return;
    await handleCategoryAction(pendingAction.cat, pendingAction.action, remarks);
    setPendingAction(null);
  };

  if (user && (!roleConfig || userRole === 'employee')) return null;

  const pendingGroupCount = buildGroups(pendingClaims).length + (canApproveTransport ? pendingTransportRequests.length : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">Review and process claims awaiting your approval — approve per category</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{tab === 'pending' ? 'Pending Groups' : 'Processed'}</p>
              <p className="text-2xl font-bold text-amber-600">{pendingGroupCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{pendingClaims.reduce((s,c) => s+(c.amount||0),0).toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Your Role</p>
              <p className="text-lg font-semibold text-blue-600 capitalize">{userRole.replace('_',' ')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Search */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="w-4 h-4" /> Pending ({pendingGroupCount})
                  </TabsTrigger>
                  <TabsTrigger value="processed">Processed</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims Table */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
            ) : claimGroups.length === 0 && filteredTransport.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tab === 'pending' ? 'All caught up!' : 'No processed items'}
                </h3>
                <p className="text-gray-500">
                  {tab === 'pending' ? 'No items waiting for your approval.' : 'Items you process will appear here.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Claim #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Categories</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {canApproveTransport && (
                      <TransportApprovalRows
                        requests={filteredTransport}
                        tab={tab}
                        userRole={userRole}
                        onAction={(req, action) => { setSelectedTransport(req); setTransportActionType(action); }}
                      />
                    )}
                    {claimGroups.map(group => (
                      <GroupedClaimRow
                        key={group.main_claim_id}
                        group={group}
                        userRole={userRole}
                        roleConfig={roleConfig}
                        onCategoryAction={handleCategoryAction}
                        isProcessed={tab === 'processed'}
                      />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval modal for reject/send_back actions requiring remarks */}
      <ApprovalActionModal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleModalConfirm}
        action={pendingAction?.action}
        claimNumber={pendingAction?.cat?.main_claim_number}
        isLoading={updateClaimMutation.isPending}
      />

      {/* Transport Action Modal */}
      <ApprovalActionModal
        isOpen={!!selectedTransport && !!transportActionType}
        onClose={() => { setSelectedTransport(null); setTransportActionType(null); }}
        onConfirm={(remarks) => handleTransportAction(selectedTransport, transportActionType, remarks)}
        action={transportActionType}
        claimNumber={selectedTransport?.tar_number}
        isLoading={updateTransportMutation.isPending}
      />
    </div>
  );
}