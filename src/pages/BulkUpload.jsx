import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileSpreadsheet, CheckCircle2, XCircle, 
  Trash2, Send, AlertCircle, Eye, Edit
} from "lucide-react";
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import ExcelTemplateGenerator from '../components/bulk/ExcelTemplateGenerator';
import BulkUploadProcessor from '../components/bulk/BulkUploadProcessor';
import ClaimStatusBadge from '../components/claims/ClaimStatusBadge';
import { logCriticalAction } from '../components/session/SessionLogger';

export default function BulkUpload() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const userRole = userData?.portal_role || userData?.role;
      
      // Restrict access
      if (!['admin_head', 'cro', 'admin'].includes(userRole)) {
        toast.error('Access Denied: Bulk Upload is only available for Admin Head and CRO');
        window.location.href = createPageUrl('Dashboard');
      }
    };
    loadUser();
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ is_active: true }, 'sort_order'),
  });

  const { data: draftClaims = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['bulk-draft-claims', user?.email],
    queryFn: () => base44.entities.Claim.filter({
      uploaded_by: user?.email,
      status: 'draft',
      source: 'Bulk Upload'
    }, '-created_date'),
    enabled: !!user?.email,
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (claimId) => {
      await base44.entities.Claim.delete(claimId);
      await base44.entities.BulkUploadLog.create({
        uploader_email: user.email,
        uploader_role: user.portal_role || user.role,
        action_type: 'delete_draft',
        claims_count: 1,
        claim_ids: [claimId],
        notes: 'Deleted draft claim'
      });
    },
    onSuccess: (_, claimId) => {
      toast.success('Draft claim deleted');
      logCriticalAction('Bulk Upload', 'Delete Draft', claimId);
      queryClient.invalidateQueries({ queryKey: ['bulk-draft-claims'] });
    },
  });

  const submitApprovedMutation = useMutation({
    mutationFn: async (claim) => {
      const userRole = user?.portal_role || user?.role;
      const claimType = claim.claim_type;
      
      let newStatus = 'submitted';
      let currentApproverRole = '';

      // Auto-approval logic based on requirements
      if (claimType === 'normal') {
        // Normal claims: auto-approved, directly to Finance
        newStatus = 'cfo_approved';
        currentApproverRole = 'finance';
      } else if (claimType === 'sales_promotion' && userRole === 'cro') {
        // Sales promotion by CRO: auto-apply CRO approval, send to CFO
        newStatus = 'cro_approved';
        currentApproverRole = 'cfo';
      }

      // Update claim
      await base44.entities.Claim.update(claim.id, {
        status: newStatus,
        current_approver_role: currentApproverRole,
      });

      // Create approval log for auto-approval
      if (claimType === 'normal') {
        await base44.entities.ApprovalLog.create({
          claim_id: claim.id,
          claim_number: claim.claim_number,
          approver_email: user.email,
          approver_name: user.full_name,
          approver_role: userRole,
          stage: 'admin_approval',
          action: 'approved',
          remarks: 'Auto-approved: Bulk upload - Normal reimbursement',
          previous_status: 'draft',
          new_status: newStatus
        });
      } else if (claimType === 'sales_promotion' && userRole === 'cro') {
        await base44.entities.ApprovalLog.create({
          claim_id: claim.id,
          claim_number: claim.claim_number,
          approver_email: user.email,
          approver_name: user.full_name,
          approver_role: userRole,
          stage: 'cro_approval',
          action: 'approved',
          remarks: 'Auto-approved: Bulk upload by CRO',
          previous_status: 'draft',
          new_status: newStatus
        });
      }

      // Log bulk action
      await base44.entities.BulkUploadLog.create({
        uploader_email: user.email,
        uploader_role: userRole,
        action_type: claimType === 'normal' ? 'auto_approve' : 'submit_approved',
        claims_count: 1,
        claim_ids: [claim.id],
        notes: `Submitted approved claim: ${claim.claim_number}`
      });

      // Send notification to employee
      await base44.integrations.Core.SendEmail({
        to: claim.employee_email,
        subject: `Claim ${claim.claim_number} Submitted`,
        body: `Dear ${claim.employee_name},\n\nYour claim ${claim.claim_number} has been submitted via bulk upload and is now in the approval workflow.\n\nClaim Details:\n- Amount: ₹${claim.amount}\n- Purpose: ${claim.purpose}\n- Status: ${newStatus.replace('_', ' ').toUpperCase()}\n\nThank you.`
      });
    },
    onSuccess: (_, claim) => {
      toast.success('Claim submitted to workflow');
      logCriticalAction('Bulk Upload', 'Submit Bulk Claim', claim.claim_number);
      queryClient.invalidateQueries({ queryKey: ['bulk-draft-claims'] });
    },
  });

  const approvedClaims = draftClaims.filter(c => c.excel_approval_status === 'Approved');
  const rejectedClaims = draftClaims.filter(c => c.excel_approval_status === 'Rejected');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Claims</h1>
            <p className="text-gray-500 mt-1">
              Upload multiple claims at once using Excel
            </p>
          </div>
          <Badge className="bg-blue-600 text-white px-4 py-2">
            {user?.portal_role?.replace('_', ' ').toUpperCase() || user?.role?.toUpperCase()}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ExcelTemplateGenerator categories={categories} />
          <BulkUploadProcessor 
            user={user} 
            categories={categories}
            onUploadComplete={refetchDrafts}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Draft Claims (Bulk Uploaded)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="approved">
              <TabsList>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Approved ({approvedClaims.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejected ({rejectedClaims.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approved" className="space-y-4 mt-4">
                {approvedClaims.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No approved draft claims. Upload an Excel file with claims marked as "Approved".
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {approvedClaims.map(claim => (
                      <div key={claim.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-gray-900">{claim.claim_number}</p>
                            <Badge className="bg-green-600">Approved in Excel</Badge>
                            <Badge variant="outline">{claim.claim_type === 'sales_promotion' ? 'Sales Promotion' : 'Normal'}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{claim.purpose}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Employee: {claim.employee_name}</span>
                            <span>Amount: ₹{claim.amount?.toLocaleString('en-IN')}</span>
                            <span>Category: {claim.category_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={createPageUrl('ClaimDetails') + `?id=${claim.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            onClick={() => submitApprovedMutation.mutate(claim)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={submitApprovedMutation.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Submit to Workflow
                          </Button>
                          <Button
                            onClick={() => deleteDraftMutation.mutate(claim.id)}
                            variant="destructive"
                            size="sm"
                            disabled={deleteDraftMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4 mt-4">
                {rejectedClaims.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No rejected draft claims.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {rejectedClaims.map(claim => (
                      <div key={claim.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-gray-900">{claim.claim_number}</p>
                            <Badge className="bg-red-600">Rejected in Excel</Badge>
                            <Badge variant="outline">{claim.claim_type === 'sales_promotion' ? 'Sales Promotion' : 'Normal'}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{claim.purpose}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Employee: {claim.employee_name}</span>
                            <span>Amount: ₹{claim.amount?.toLocaleString('en-IN')}</span>
                            <span>Category: {claim.category_name}</span>
                          </div>
                          <Alert variant="destructive" className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              This claim was marked as "Rejected" in Excel. You can delete it or manually correct and resubmit.
                            </AlertDescription>
                          </Alert>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={createPageUrl('ClaimDetails') + `?id=${claim.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            onClick={() => deleteDraftMutation.mutate(claim.id)}
                            variant="destructive"
                            size="sm"
                            disabled={deleteDraftMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}