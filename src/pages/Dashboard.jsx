import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, FileText, CheckCircle, XCircle, Clock, 
  IndianRupee, TrendingUp, AlertCircle, ArrowRight,
  Send, Banknote, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StatsCard from '../components/dashboard/StatsCard';
import ClaimCard from '../components/claims/ClaimCard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('my_claims'); // 'my_claims' or 'pending_actions'

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: myClaims = [], isLoading: myClaimsLoading } = useQuery({
    queryKey: ['my-claims', user?.email],
    queryFn: () => base44.entities.Claim.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const userRole = user?.portal_role || user?.role || 'employee';
  const canApprove = ['junior_admin', 'manager', 'admin_head', 'cro', 'cfo', 'finance', 'admin'].includes(userRole);

  const { data: pendingClaims = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-approvals', userRole],
    queryFn: async () => {
      const roleStatusMap = {
        junior_admin: 'submitted',
        manager: 'verified',
        admin_head: 'manager_approved',
        cro: 'admin_approved',
        cfo: 'cro_approved',
        finance: 'cfo_approved',
      };
      const targetStatus = roleStatusMap[userRole];
      if (!targetStatus) return [];
      return base44.entities.Claim.filter({ status: targetStatus }, '-created_date');
    },
    enabled: !!user && canApprove,
  });

  const claims = viewMode === 'my_claims' ? myClaims : pendingClaims;
  const isLoading = viewMode === 'my_claims' ? myClaimsLoading : pendingLoading;

  const stats = {
    total: claims.length,
    submitted: claims.filter(c => c.status === 'submitted').length,
    pending: claims.filter(c => ['submitted', 'verified', 'manager_approved', 'cro_approved'].includes(c.status)).length,
    approved: claims.filter(c => ['admin_approved', 'cfo_approved', 'paid'].includes(c.status)).length,
    rejected: claims.filter(c => c.status === 'rejected').length,
    paid: claims.filter(c => c.status === 'paid').length,
    draft: claims.filter(c => c.status === 'draft').length,
    totalAmount: claims.reduce((sum, c) => sum + (c.amount || 0), 0),
    paidAmount: claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.amount || 0), 0),
  };

  const filteredClaims = statusFilter === 'all' 
    ? claims 
    : claims.filter(c => {
        if (statusFilter === 'pending') {
          return ['submitted', 'verified', 'manager_approved', 'cro_approved', 'admin_approved', 'cfo_approved'].includes(c.status);
        }
        return c.status === statusFilter;
      });

  const recentClaims = filteredClaims.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-gray-500 mt-1">
              Track and manage your expense claims
            </p>
          </div>
          <Link to={createPageUrl('SubmitClaim')}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              <Plus className="w-5 h-5 mr-2" />
              New Claim
            </Button>
          </Link>
        </div>

        {/* View Toggle */}
        {canApprove && (
          <div className="mb-6">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="my_claims" className="gap-2">
                  <FileText className="w-4 h-4" />
                  My Claims
                </TabsTrigger>
                <TabsTrigger value="pending_actions" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Pending Actions
                  {pendingClaims.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {pendingClaims.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Claims"
            value={stats.total}
            icon={FileText}
            color="blue"
            delay={0}
          />
          <StatsCard
            title="Pending Approval"
            value={stats.pending}
            icon={Clock}
            color="amber"
            delay={0.1}
          />
          <StatsCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="green"
            delay={0.2}
          />
          <StatsCard
            title="Amount Paid"
            value={`₹${stats.paidAmount.toLocaleString('en-IN')}`}
            icon={Banknote}
            color="indigo"
            delay={0.3}
          />
        </div>

        {/* Quick Stats Summary */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {viewMode === 'my_claims' ? 'My Claims' : 'Pending My Action'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                    <TabsList className="bg-gray-100">
                      <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                      <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                      <TabsTrigger value="paid" className="text-xs">Paid</TabsTrigger>
                      <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentClaims.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No claims found</p>
                  <Link to={createPageUrl('SubmitClaim')}>
                    <Button variant="link" className="mt-2 text-blue-600">
                      Submit your first claim
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {recentClaims.map((claim, index) => (
                      <ClaimCard key={claim.id} claim={claim} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
              
              {claims.length > 5 && (
                <div className="mt-6 text-center">
                  <Link to={createPageUrl('MyClaims')}>
                    <Button variant="outline" className="gap-2">
                      View All Claims
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Submitted</span>
                  </div>
                  <span className="font-semibold text-blue-600">{stats.submitted}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">In Progress</span>
                  </div>
                  <span className="font-semibold text-amber-600">{stats.pending}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Banknote className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Paid</span>
                  </div>
                  <span className="font-semibold text-green-600">{stats.paid}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Rejected</span>
                  </div>
                  <span className="font-semibold text-red-600">{stats.rejected}</span>
                </div>

                {stats.draft > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Drafts</span>
                    </div>
                    <span className="font-semibold text-gray-600">{stats.draft}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Claimed</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₹{stats.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}