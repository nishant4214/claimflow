import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, FileText, Calendar, IndianRupee, 
  Tag, CreditCard, User, Building, Eye,
  Download, Edit, RotateCcw
} from "lucide-react";
import { motion } from "framer-motion";
import ClaimStatusBadge from '../components/claims/ClaimStatusBadge';
import SLAIndicator from '../components/claims/SLAIndicator';
import ClaimTimeline from '../components/claims/ClaimTimeline';
import DocumentViewer from '../components/documents/DocumentViewer';

export default function ClaimDetails() {
  const [user, setUser] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const claimId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: claim, isLoading } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => base44.entities.Claim.filter({ id: claimId }),
    select: (data) => data[0],
    enabled: !!claimId,
  });

  const { data: approvalLogs = [] } = useQuery({
    queryKey: ['approval-logs', claimId],
    queryFn: () => base44.entities.ApprovalLog.filter({ claim_id: claimId }, 'created_date'),
    enabled: !!claimId,
  });

  if (isLoading || !claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const canEdit = claim.status === 'draft' || claim.status === 'sent_back';
  const canResubmit = claim.status === 'sent_back';

  const handleViewDocument = (url, index) => {
    setSelectedDocument({ url, name: `Document ${index + 1}` });
    setViewerOpen(true);
  };

  const handleDownloadDocument = (url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_${index + 1}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('MyClaims')}>
            <Button variant="ghost" className="mb-4 -ml-2 text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Claims
            </Button>
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">
                  {claim.claim_number || `CLM-${claim.id?.slice(-6)}`}
                </h1>
                <ClaimStatusBadge status={claim.status} size="lg" />
                {claim.claim_type === 'sales_promotion' && (
                  <Badge className="bg-purple-100 text-purple-700">
                    Sales Promotion
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 mt-2">{claim.purpose}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {claim.sla_date && !['paid', 'rejected'].includes(claim.status) && (
                <SLAIndicator 
                  slaDate={claim.sla_date} 
                  submissionDate={claim.created_date} 
                />
              )}
              {canEdit && (
                <Link to={createPageUrl(`SubmitClaim?edit=${claim.id}`)}>
                  <Button variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Claim
                  </Button>
                </Link>
              )}
              {canResubmit && (
                <Link to={createPageUrl(`SubmitClaim?resubmit=${claim.id}`)}>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <RotateCcw className="w-4 h-4" />
                    Resubmit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Claim Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Category</p>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{claim.category_name}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Expense Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {claim.expense_date && format(parseISO(claim.expense_date), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Amount</p>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-4 h-4 text-gray-400" />
                          <span className="text-2xl font-bold text-gray-900">
                            {claim.amount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Bill Number</p>
                        <span className="font-medium">{claim.bill_number}</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Bill Date</p>
                        <span className="font-medium">
                          {claim.bill_date && format(parseISO(claim.bill_date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Payment Mode</p>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{claim.payment_mode}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {claim.description && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Description</p>
                        <p className="text-gray-700">{claim.description}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Documents Card */}
            {claim.document_urls?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Attached Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {claim.document_urls.map((url, index) => {
                        const fileExtension = url.split('.').pop()?.toLowerCase();
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
                        const isPDF = fileExtension === 'pdf';
                        
                        return (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg hover:border-blue-300 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-blue-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">
                                    Document {index + 1}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    {isPDF && <Badge variant="outline" className="text-[10px] px-1.5 py-0">PDF</Badge>}
                                    {isImage && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Image</Badge>}
                                    {!isPDF && !isImage && <Badge variant="outline" className="text-[10px] px-1.5 py-0">File</Badge>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleViewDocument(url, index)}
                                  className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                                  size="sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                                <Button 
                                  onClick={() => handleDownloadDocument(url, index)}
                                  variant="outline"
                                  className="gap-2 hover:bg-gray-100 hover:border-gray-300"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Rejection/Send Back Reason */}
            {(claim.rejection_reason || claim.send_back_reason) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className={`border-0 shadow-sm ${
                  claim.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        claim.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        <FileText className={`w-4 h-4 ${
                          claim.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <p className={`font-medium ${
                          claim.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                        }`}>
                          {claim.status === 'rejected' ? 'Rejection Reason' : 'Sent Back for Correction'}
                        </p>
                        <p className="text-gray-700 mt-1">
                          {claim.rejection_reason || claim.send_back_reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Payment Info */}
            {claim.status === 'paid' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-0 shadow-sm bg-green-50">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100">
                          <IndianRupee className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-700">Payment Processed</p>
                          {claim.payment_date && (
                            <p className="text-sm text-green-600">
                              {format(parseISO(claim.payment_date), 'MMMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      {claim.payment_reference && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Reference</p>
                          <p className="font-mono text-sm">{claim.payment_reference}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Employee Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500 font-medium">
                    Submitted By
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {claim.employee_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{claim.employee_name}</p>
                      <p className="text-sm text-gray-500">{claim.employee_email}</p>
                    </div>
                  </div>
                  {(claim.department || claim.designation) && (
                    <div className="pt-3 border-t space-y-2">
                      {claim.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{claim.department}</span>
                        </div>
                      )}
                      {claim.designation && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{claim.designation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Approval Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-500 font-medium">
                    Approval Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ClaimTimeline logs={approvalLogs} claim={claim} />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Document Viewer Modal */}
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentUrl={selectedDocument?.url}
          documentName={selectedDocument?.name}
        />
      </div>
    </div>
  );
}