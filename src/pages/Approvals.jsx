import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  Search, CheckCircle, XCircle, ArrowLeft, Eye,
  Clock, AlertTriangle, AlertCircle, IndianRupee, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ClaimStatusBadge from '../components/claims/ClaimStatusBadge';
import SLAIndicator from '../components/claims/SLAIndicator';
import ApprovalActionModal from '../components/approvals/ApprovalActionModal';

const ROLE_STAGES = {
  junior_admin: { statuses: ['submitted'], stage: 'verification', nextStatus: 'verified' },
  manager: { statuses: ['verified', 'submitted'], stage: 'manager_approval', nextStatus: 'manager_approved' },
  admin_head: { statuses: ['manager_approved'], stage: 'admin_approval', nextStatus: 'admin_approved' },
  cro: { statuses: ['manager_approved'], stage: 'cro_approval', nextStatus: 'cro_approved' },
  cfo: { statuses: ['cro_approved'], stage: 'cfo_approval', nextStatus: 'cfo_approved' },
};

export default function Approvals() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [tab, setTab] = useState('pending');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const userRole = user?.portal_role || 'employee';
  const roleConfig = ROLE_STAGES[userRole];

  const { data: allClaims = [], isLoading } = useQuery({
    queryKey: ['pending-approvals', userRole],
    queryFn: () => base44.entities.Claim.list('-created_date'),
    enabled: !!user && !!roleConfig,
  });

  // Filter claims based on role and workflow
  const pendingClaims = allClaims.filter(claim => {
    if (!roleConfig) return false;
    
    // For normal claims workflow
    if (claim.claim_type === 'normal') {
      if (userRole === 'junior_admin' && claim.status === 'submitted') return true;
      if (userRole === 'manager' && claim.status === 'verified') return true;
      if (userRole === 'admin_head' && claim.status === 'manager_approved') return true;
    }
    
    // For sales promotion claims workflow
    if (claim.claim_type === 'sales_promotion') {
      if (userRole === 'manager' && claim.status === 'submitted') return true;
      if (userRole === 'cro' && claim.status === 'manager_approved') return true;
      if (userRole === 'cfo' && claim.status === 'cro_approved') return true;
    }
    
    return false;
  });

  const processedClaims = allClaims.filter(claim => {
    // Show claims this user has acted on
    return claim.current_approver_role !== userRole && 
           !['draft', 'submitted'].includes(claim.status);
  });

  const displayedClaims = tab === 'pending' ? pendingClaims : processedClaims;

  const filteredClaims = displayedClaims.filter(claim => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return claim.claim_number?.toLowerCase().includes(searchLower) ||
           claim.employee_name?.toLowerCase().includes(searchLower) ||
           claim.purpose?.toLowerCase().includes(searchLower);
  });

  // Stats based on current tab
  const currentStats = {
    total: displayedClaims.length,
    urgent: displayedClaims.filter(c => getSLAStatus(c) === 'urgent').length,
    totalAmount: displayedClaims.reduce((sum, c) => sum + (c.amount || 0), 0),
  };

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-approvals']);
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.ApprovalLog.create(logData),
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  const handleAction = async (remarks) => {
    if (!selectedClaim || !actionType) return;

    const claim = selectedClaim;
    let newStatus, nextApproverRole;

    if (actionType === 'approve') {
      if (claim.claim_type === 'normal') {
        if (userRole === 'junior_admin') {
          newStatus = 'verified';
          nextApproverRole = 'manager';
        } else if (userRole === 'manager') {
          newStatus = 'manager_approved';
          nextApproverRole = 'admin_head';
        } else if (userRole === 'admin_head') {
          newStatus = 'admin_approved';
          nextApproverRole = 'finance';
        }
      } else {
        // Sales promotion
        if (userRole === 'manager') {
          newStatus = 'manager_approved';
          nextApproverRole = 'cro';
        } else if (userRole === 'cro') {
          newStatus = 'cro_approved';
          nextApproverRole = 'cfo';
        } else if (userRole === 'cfo') {
          newStatus = 'cfo_approved';
          nextApproverRole = 'finance';
        }
      }
    } else if (actionType === 'reject') {
      newStatus = 'rejected';
    } else if (actionType === 'send_back') {
      newStatus = 'sent_back';
    }

    await updateClaimMutation.mutateAsync({
      id: claim.id,
      data: {
        status: newStatus,
        current_approver_role: nextApproverRole,
        ...(actionType === 'reject' && { rejection_reason: remarks }),
        ...(actionType === 'send_back' && { send_back_reason: remarks }),
      }
    });

    await createLogMutation.mutateAsync({
      claim_id: claim.id,
      claim_number: claim.claim_number,
      approver_email: user.email,
      approver_name: user.full_name,
      approver_role: userRole,
      stage: roleConfig?.stage,
      action: actionType === 'approve' ? 'approved' : actionType,
      remarks,
      previous_status: claim.status,
      new_status: newStatus,
    });

    // Notify employee
    await createNotificationMutation.mutateAsync({
      recipient_email: claim.employee_email,
      claim_id: claim.id,
      claim_number: claim.claim_number,
      notification_type: actionType === 'approve' ? 'claim_approved' : 
                        actionType === 'reject' ? 'claim_rejected' : 'claim_sent_back',
      title: actionType === 'approve' ? 'Claim Approved' :
             actionType === 'reject' ? 'Claim Rejected' : 'Claim Sent Back',
      message: actionType === 'approve' 
        ? `Your claim ${claim.claim_number} has been approved by ${user.full_name}.`
        : `Your claim ${claim.claim_number} has been ${actionType === 'reject' ? 'rejected' : 'sent back'}. Reason: ${remarks}`,
    });

    toast.success(
      actionType === 'approve' ? 'Claim approved successfully' :
      actionType === 'reject' ? 'Claim rejected' : 'Claim sent back for correction'
    );

    setSelectedClaim(null);
    setActionType(null);
  };

  const getSLAStatus = (claim) => {
    if (!claim.sla_date || !claim.created_date) return 'normal';
    const daysRemaining = differenceInDays(parseISO(claim.sla_date), new Date());
    if (daysRemaining <= 3) return 'urgent';
    if (daysRemaining <= 10) return 'warning';
    return 'normal';
  };

  if (!roleConfig || userRole === 'employee') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500">You don't have permission to access the approvals page.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="mt-6" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500 mt-1">
            Review and process expense claims awaiting your approval
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{tab === 'pending' ? 'Pending' : 'Processed'}</p>
                  <p className="text-2xl font-bold text-amber-600">{currentStats.total}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Urgent (≤3 days)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {currentStats.urgent}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{currentStats.totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <IndianRupee className="w-8 h-8 text-gray-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Your Role</p>
                  <p className="text-lg font-semibold text-blue-600 capitalize">
                    {userRole.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Tabs */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="pending" className="gap-2">
                    <Clock className="w-4 h-4" />
                    Pending ({pendingClaims.length})
                  </TabsTrigger>
                  <TabsTrigger value="processed">
                    Processed
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search claims..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tab === 'pending' ? 'All caught up!' : 'No processed claims'}
                </h3>
                <p className="text-gray-500">
                  {tab === 'pending' 
                    ? 'There are no claims waiting for your approval.'
                    : 'Claims you process will appear here.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Claim #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredClaims.map((claim, index) => (
                      <motion.tr
                        key={claim.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          getSLAStatus(claim) === 'urgent' ? 'bg-red-50/50' :
                          getSLAStatus(claim) === 'warning' ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {claim.claim_number || `CLM-${claim.id?.slice(-6)}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{claim.employee_name}</p>
                            <p className="text-xs text-gray-500">{claim.department}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="line-clamp-1 max-w-[200px]">{claim.purpose}</span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{claim.amount?.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            claim.claim_type === 'sales_promotion' 
                              ? 'border-purple-200 text-purple-700 bg-purple-50' 
                              : 'border-blue-200 text-blue-700 bg-blue-50'
                          }>
                            {claim.claim_type === 'sales_promotion' ? 'Sales' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ClaimStatusBadge status={claim.status} />
                        </TableCell>
                        <TableCell>
                          {claim.sla_date && (
                            <SLAIndicator 
                              slaDate={claim.sla_date} 
                              submissionDate={claim.created_date} 
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Link to={createPageUrl(`ClaimDetails?id=${claim.id}`)}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {tab === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedClaim(claim);
                                    setActionType('approve');
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                {userRole === 'junior_admin' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                    onClick={() => {
                                      setSelectedClaim(claim);
                                      setActionType('send_back');
                                    }}
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedClaim(claim);
                                    setActionType('reject');
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Modal */}
      <ApprovalActionModal
        isOpen={!!selectedClaim && !!actionType}
        onClose={() => {
          setSelectedClaim(null);
          setActionType(null);
        }}
        onConfirm={handleAction}
        action={actionType}
        claimNumber={selectedClaim?.claim_number}
        isLoading={updateClaimMutation.isPending}
      />
    </div>
  );
}