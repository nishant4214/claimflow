import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from 'date-fns';
import { 
  Search, Banknote, Pause, Eye, CalendarIcon, 
  Download, IndianRupee, Clock, CheckCircle, AlertCircle,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ClaimStatusBadge from '../components/claims/ClaimStatusBadge';

export default function Finance() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('queue');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentReference, setPaymentReference] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['finance-claims'],
    queryFn: () => base44.entities.Claim.list('-created_date'),
  });

  // Filter claims for finance processing
  const queueClaims = claims.filter(c => 
    ['admin_approved', 'cfo_approved'].includes(c.status)
  );
  const onHoldClaims = claims.filter(c => c.status === 'on_hold');
  const paidClaims = claims.filter(c => c.status === 'paid');

  const displayedClaims = tab === 'queue' ? queueClaims :
                          tab === 'on_hold' ? onHoldClaims : paidClaims;

  const filteredClaims = displayedClaims.filter(claim => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return claim.claim_number?.toLowerCase().includes(searchLower) ||
           claim.employee_name?.toLowerCase().includes(searchLower);
  });

  const updateClaimMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['finance-claims']);
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.ApprovalLog.create(logData),
  });

  const createNotificationMutation = useMutation({
    mutationFn: (data) => base44.entities.Notification.create(data),
  });

  const handleMarkAsPaid = async () => {
    if (!selectedClaim) return;

    await updateClaimMutation.mutateAsync({
      id: selectedClaim.id,
      data: {
        status: 'paid',
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        payment_reference: paymentReference,
      }
    });

    await createLogMutation.mutateAsync({
      claim_id: selectedClaim.id,
      claim_number: selectedClaim.claim_number,
      approver_email: user?.email,
      approver_name: user?.full_name,
      approver_role: 'finance',
      stage: 'finance_processing',
      action: 'paid',
      remarks: `Payment processed. Reference: ${paymentReference}`,
    });

    await createNotificationMutation.mutateAsync({
      recipient_email: selectedClaim.employee_email,
      claim_id: selectedClaim.id,
      claim_number: selectedClaim.claim_number,
      notification_type: 'payment_processed',
      title: 'Payment Processed',
      message: `Your claim ${selectedClaim.claim_number} for ₹${selectedClaim.amount.toLocaleString('en-IN')} has been paid. Reference: ${paymentReference}`,
    });

    toast.success('Payment marked as completed');
    setShowPaymentModal(false);
    setSelectedClaim(null);
    setPaymentReference('');
  };

  const handlePutOnHold = async (claim) => {
    await updateClaimMutation.mutateAsync({
      id: claim.id,
      data: { status: 'on_hold' }
    });

    await createLogMutation.mutateAsync({
      claim_id: claim.id,
      claim_number: claim.claim_number,
      approver_email: user?.email,
      approver_name: user?.full_name,
      approver_role: 'finance',
      stage: 'finance_processing',
      action: 'on_hold',
      remarks: 'Payment put on hold',
    });

    toast.info('Claim put on hold');
  };

  const handleReleaseHold = async (claim) => {
    const previousStatus = claim.claim_type === 'sales_promotion' ? 'cfo_approved' : 'admin_approved';
    
    await updateClaimMutation.mutateAsync({
      id: claim.id,
      data: { status: previousStatus }
    });

    toast.success('Claim released from hold');
  };

  const totalQueueAmount = queueClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPaidAmount = paidClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

  const userRole = user?.portal_role;
  if (userRole !== 'finance' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500">Only finance team members can access this page.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Process payments and manage claim payouts
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Payment Queue</p>
                  <p className="text-2xl font-bold text-amber-900">{queueClaims.length}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">On Hold</p>
                  <p className="text-2xl font-bold text-orange-900">{onHoldClaims.length}</p>
                </div>
                <Pause className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Paid This Month</p>
                  <p className="text-2xl font-bold text-green-900">{paidClaims.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Queue Amount</p>
                  <p className="text-xl font-bold text-blue-900">
                    ₹{totalQueueAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <IndianRupee className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Filters */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="queue" className="gap-2">
                    <Clock className="w-4 h-4" />
                    Queue ({queueClaims.length})
                  </TabsTrigger>
                  <TabsTrigger value="on_hold" className="gap-2">
                    <Pause className="w-4 h-4" />
                    On Hold ({onHoldClaims.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid" className="gap-2">
                    <Banknote className="w-4 h-4" />
                    Paid ({paidClaims.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search claims..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
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
                <Banknote className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tab === 'queue' ? 'No pending payments' : 
                   tab === 'on_hold' ? 'No claims on hold' : 'No payment history'}
                </h3>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Claim #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    {tab === 'paid' && <TableHead>Payment Date</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredClaims.map((claim) => (
                      <motion.tr
                        key={claim.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {claim.claim_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{claim.employee_name}</p>
                            <p className="text-xs text-gray-500">{claim.employee_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{claim.department || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          ₹{claim.amount?.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            claim.claim_type === 'sales_promotion' 
                              ? 'border-purple-200 text-purple-700' 
                              : 'border-blue-200 text-blue-700'
                          }>
                            {claim.claim_type === 'sales_promotion' ? 'Sales' : 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ClaimStatusBadge status={claim.status} />
                        </TableCell>
                        {tab === 'paid' && (
                          <TableCell>
                            {claim.payment_date && format(parseISO(claim.payment_date), 'MMM d, yyyy')}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Link to={createPageUrl(`ClaimDetails?id=${claim.id}`)}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {tab === 'queue' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setSelectedClaim(claim);
                                    setShowPaymentModal(true);
                                  }}
                                >
                                  <Banknote className="w-4 h-4 mr-1" />
                                  Pay
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-200"
                                  onClick={() => handlePutOnHold(claim)}
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {tab === 'on_hold' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200"
                                onClick={() => handleReleaseHold(claim)}
                              >
                                Release
                              </Button>
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

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Mark claim {selectedClaim?.claim_number} as paid
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount</span>
                <span className="text-2xl font-bold">
                  ₹{selectedClaim?.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paymentDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => date && setPaymentDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Reference / Transaction ID</Label>
              <Input
                placeholder="Enter reference number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleMarkAsPaid}
              disabled={updateClaimMutation.isPending}
            >
              <Banknote className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}