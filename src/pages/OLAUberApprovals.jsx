import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { Car, Eye, CheckCircle, XCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TransportStatusBadge from '../components/transport/TransportStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function OLAUberApprovals() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [remarks, setRemarks] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';
  
  // Fetch all transport requests
  const { data: allRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['all-transport-requests-approvals'],
    queryFn: () => base44.entities.TransportRequest.list('-created_date'),
    enabled: !!user?.email,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.TransportRequest.subscribe(() => {
      refetch();
    });
    return () => unsubscribe();
  }, [user?.email, refetch]);

  // Filter requests by stage and status for functional_lead
  const pendingRequests = allRequests.filter(r => 
    r.status === 'pending_lead' && r.stage === 'lead'
  );

  const approvedRequests = allRequests.filter(r => 
    r.status === 'approved' && r.stage === 'completed'
  );

  const rejectedRequests = allRequests.filter(r => 
    r.status === 'rejected'
  );

  const sentBackRequests = allRequests.filter(r => 
    r.status === 'sent_back'
  );

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, action, reason }) => {
      const request = allRequests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      const updatedHistory = [...(request.history || []), {
        action,
        by_name: user.full_name,
        by_email: user.email,
        by_role: userRole,
        remarks: reason,
        timestamp: new Date().toISOString(),
      }];

      let updateData = { history: updatedHistory };

      if (action === 'approved') {
        updateData.status = 'approved';
        updateData.stage = 'completed';
        updateData.approved_by_lead = user.email;
      } else if (action === 'rejected') {
        updateData.status = 'rejected';
        updateData.rejection_reason = reason;
      } else if (action === 'sent_back') {
        updateData.status = 'sent_back';
        updateData.stage = 'manager';
        updateData.send_back_reason = reason;
      }

      await base44.entities.TransportRequest.update(requestId, updateData);

      // Send email notification
      let emailSubject = '';
      let emailBody = '';

      if (action === 'approved') {
        emailSubject = `✅ OLA/Uber Request Approved - ${request.tar_number}`;
        emailBody = `<p>Dear ${request.employee_name},</p>
          <p>Your OLA/Uber transport access request has been <strong>approved</strong>.</p>
          <p><strong>Request Details:</strong></p>
          <ul>
            <li>Request ID: ${request.tar_number}</li>
            <li>Transport Type: ${request.transport_type}</li>
            <li>Approved By: ${user.full_name}</li>
          </ul>
          <p>Your access is now active. You can start using OLA/Uber with the approved service.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br/>HR Team</p>`;
      } else if (action === 'rejected') {
        emailSubject = `❌ OLA/Uber Request Rejected - ${request.tar_number}`;
        emailBody = `<p>Dear ${request.employee_name},</p>
          <p>Your OLA/Uber transport access request has been <strong>rejected</strong>.</p>
          <p><strong>Request Details:</strong></p>
          <ul>
            <li>Request ID: ${request.tar_number}</li>
            <li>Transport Type: ${request.transport_type}</li>
            <li>Rejection Reason: ${reason || 'Not specified'}</li>
          </ul>
          <p>If you believe this is in error or would like to discuss further, please contact your manager or the HR team.</p>
          <p>Best regards,<br/>HR Team</p>`;
      } else if (action === 'sent_back') {
        emailSubject = `🔄 OLA/Uber Request Needs Clarification - ${request.tar_number}`;
        emailBody = `<p>Dear ${request.employee_name},</p>
          <p>Your OLA/Uber transport access request has been <strong>sent back for clarification</strong>.</p>
          <p><strong>Request Details:</strong></p>
          <ul>
            <li>Request ID: ${request.tar_number}</li>
            <li>Transport Type: ${request.transport_type}</li>
            <li>Clarification Needed: ${reason || 'Please provide additional details'}</li>
          </ul>
          <p>Please review the feedback and resubmit your request with the required clarifications.</p>
          <p>Best regards,<br/>HR Team</p>`;
      }

      await base44.integrations.Core.SendEmail({
        to: request.employee_email,
        subject: emailSubject,
        body: emailBody,
        from_name: 'HR Team',
      });

      // Send in-app notification
      await base44.entities.Notification.create({
        recipient_email: request.employee_email,
        notification_type: action === 'approved' ? 'transport_approved' : 
                          action === 'rejected' ? 'transport_rejected' : 'transport_sent_back',
        title: `Transport Request ${action === 'approved' ? 'Approved' : action === 'rejected' ? 'Rejected' : 'Sent Back'}`,
        message: `Your OLA/Uber request (${request.tar_number}) has been ${action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'sent back for clarification'}.${reason ? ` Reason: ${reason}` : ''}`,
        email_sent: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-transport-requests-approvals']);
      toast.success(`Request ${actionType}`);
      setSelectedRequest(null);
      setActionType(null);
      setRemarks('');
    },
    onError: (error) => {
      toast.error(`Failed to ${actionType} request: ${error.message}`);
    },
  });

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setRemarks('');
  };

  const handleConfirmAction = () => {
    if ((actionType === 'reject' || actionType === 'send_back') && !remarks.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    approveMutation.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      reason: remarks,
    });
  };

  if (!user || !['functional_lead', 'admin_head', 'admin', 'super_admin'].includes(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
          <p className="text-gray-500 mt-2">Only Functional Leads can access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'pending', label: 'Pending', data: pendingRequests, color: 'text-amber-600' },
    { key: 'approved', label: 'Approved', data: approvedRequests, color: 'text-green-600' },
    { key: 'sent_back', label: 'Sent Back', data: sentBackRequests, color: 'text-blue-600' },
    { key: 'rejected', label: 'Rejected', data: rejectedRequests, color: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-600" />
            OLA/Uber Approvals
          </h1>
          <p className="text-gray-500 mt-1">Review and approve OLA/Uber transport requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {tabs.map(tab => (
            <Card key={tab.key} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{tab.label}</p>
                    <p className={`text-2xl font-bold ${tab.color}`}>{tab.data.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transport Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="border-b bg-white rounded-none p-0 w-full justify-start">
                {tabs.map(tab => (
                  <TabsTrigger 
                    key={tab.key} 
                    value={tab.key}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600"
                  >
                    {tab.label} ({tab.data.length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {tabs.map(tab => (
                <TabsContent key={tab.key} value={tab.key} className="mt-0">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    </div>
                  ) : tab.data.length === 0 ? (
                    <div className="p-12 text-center">
                      <Car className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No {tab.label.toLowerCase()} requests</h3>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Request #</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Transport Type</TableHead>
                          <TableHead>Justification</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tab.data.map(req => (
                          <TableRow key={req.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm font-medium">
                              {req.tar_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{req.employee_name}</p>
                                <p className="text-xs text-gray-500">{req.department}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                                {req.transport_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="line-clamp-1 max-w-[200px] text-sm">{req.business_justification}</span>
                            </TableCell>
                            <TableCell>
                              <TransportStatusBadge status={req.status} />
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {req.created_date ? format(parseISO(req.created_date), 'dd MMM yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(createPageUrl(`TransportRequestDetails?id=${req.id}&from=OLAUberApprovals`))}
                                  className="gap-1 text-gray-500 hover:text-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                                {tab.key === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={() => handleAction(req, 'approved')}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                      onClick={() => handleAction(req, 'send_back')}
                                    >
                                      <ArrowLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleAction(req, 'reject')}
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => actionType && setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' && 'Approve Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'send_back' && 'Send Back for Clarification'}
            </DialogTitle>
            <DialogDescription>
              Request: {selectedRequest?.tar_number}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{selectedRequest.employee_name}</span> • {selectedRequest.department}
                </p>
                <p className="text-sm mt-1">{selectedRequest.business_justification}</p>
              </div>

              {(actionType === 'reject' || actionType === 'send_back') && (
                <div className="space-y-2">
                  <Label>
                    {actionType === 'reject' ? 'Rejection Reason' : 'Clarification Required'}
                  </Label>
                  <Textarea
                    placeholder={actionType === 'reject' ? 'Why are you rejecting this request?' : 'What clarifications are needed?'}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="min-h-24"
                  />
                </div>
              )}

              {actionType === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ This request will be approved and the employee will receive immediate access.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setActionType(null)}
                  disabled={approveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={approveMutation.isPending}
                  className={
                    actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'send_back' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-red-600 hover:bg-red-700'
                  }
                >
                  {approveMutation.isPending ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}