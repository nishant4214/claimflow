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
import { Car, Plus, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import TransportRequestForm from '../components/transport/TransportRequestForm';
import TransportStatusBadge from '../components/transport/TransportStatusBadge';
import TransportTimeline from '../components/transport/TransportTimeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALLOWED_ROLES = ['employee', 'manager', 'admin_head', 'admin', 'functional_lead'];

export default function TransportAccess() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';

  const { data: myRequests = [], isLoading } = useQuery({
    queryKey: ['transport-requests', user?.email],
    queryFn: () => base44.entities.TransportRequest.filter({ employee_email: user.email }, '-created_date'),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const stats = {
    total: myRequests.length,
    pending: myRequests.filter(r => r.status === 'pending_manager' || r.status === 'pending_lead').length,
    approved: myRequests.filter(r => r.status === 'approved').length,
    rejected: myRequests.filter(r => r.status === 'rejected').length,
  };

  if (!ALLOWED_ROLES.includes(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
          <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Car className="w-8 h-8 text-blue-600" />
              Transport Access
            </h1>
            <p className="text-gray-500 mt-1">Manage OLA / Uber transport access requests</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Requests', value: stats.total, color: 'text-gray-900', icon: FileText },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600', icon: Clock },
            { label: 'Approved', value: stats.approved, color: 'text-green-600', icon: CheckCircle },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600', icon: XCircle },
          ].map(stat => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <stat.icon className="w-8 h-8 text-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Request Form */}
        {showForm && (
          <div className="mb-8">
            <TransportRequestForm
              user={user}
              onSuccess={() => setShowForm(false)}
            />
          </div>
        )}

        {/* My Requests */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="p-12 text-center">
                <Car className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
                <p className="text-gray-500">Submit a new transport access request to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Request #</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Business Justification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map(req => (
                    <TableRow key={req.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm font-medium">
                        {req.tar_number}
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(req)}
                          className="gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail / Timeline Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              {selectedRequest?.tar_number}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Employee</p>
                  <p className="font-medium">{selectedRequest.employee_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="font-medium">{selectedRequest.department}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transport Type</p>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 mt-1">
                    {selectedRequest.transport_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <div className="mt-1">
                    <TransportStatusBadge status={selectedRequest.status} />
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Business Justification</p>
                  <p className="font-medium">{selectedRequest.business_justification}</p>
                </div>
                {selectedRequest.status === 'approved' && (
                  <>
                    <div className="col-span-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-green-800 font-semibold text-sm mb-2">✅ Access Granted</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                        <div><span className="font-medium">Access Type:</span> {selectedRequest.transport_type}</div>
                        <div><span className="font-medium">Effective Date:</span> {selectedRequest.effective_date || format(new Date(), 'dd MMM yyyy')}</div>
                        {selectedRequest.approved_by_manager && (
                          <div><span className="font-medium">Approved by Manager:</span> {selectedRequest.approved_by_manager}</div>
                        )}
                        {selectedRequest.approved_by_lead && (
                          <div><span className="font-medium">Approved by Admin Head:</span> {selectedRequest.approved_by_lead}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <div className="col-span-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-red-700 text-sm"><span className="font-medium">Rejection Reason:</span> {selectedRequest.rejection_reason}</p>
                  </div>
                )}
                {selectedRequest.status === 'sent_back' && selectedRequest.send_back_reason && (
                  <div className="col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-amber-700 text-sm"><span className="font-medium">Clarification Needed:</span> {selectedRequest.send_back_reason}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <TransportTimeline request={selectedRequest} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}