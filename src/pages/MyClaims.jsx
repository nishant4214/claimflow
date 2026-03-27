import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { Plus, Search, FileText, ArrowLeft, Tag, Calendar, IndianRupee, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_CONFIG = {
  draft:              { label: 'Draft',              color: 'bg-gray-100 text-gray-700 border-gray-200' },
  submitted:          { label: 'Submitted',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  partially_approved: { label: 'Partially Approved', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:           { label: 'Approved',           color: 'bg-green-100 text-green-700 border-green-200' },
  rejected:           { label: 'Rejected',           color: 'bg-red-100 text-red-700 border-red-200' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'partially_approved', label: 'Partially Approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function MainClaimCard({ claim }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[claim.status] || STATUS_CONFIG.draft;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
      onClick={() => navigate(`/MainClaimDetails?id=${claim.id}`)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-bold text-gray-900 text-base">{claim.claim_number}</span>
              <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {claim.expense_date_from && format(parseISO(claim.expense_date_from), 'dd MMM yyyy')}
                {claim.expense_date_to && ` → ${format(parseISO(claim.expense_date_to), 'dd MMM yyyy')}`}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {claim.categories_count || 0} {claim.categories_count === 1 ? 'category' : 'categories'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-gray-600" />
              <span className="text-xl font-bold text-gray-900">
                {(claim.total_amount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-1 text-blue-600 text-xs font-medium">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
      {/* Status bar */}
      <div className={`h-1 rounded-b-xl ${
        claim.status === 'approved' ? 'bg-green-400'
        : claim.status === 'rejected' ? 'bg-red-400'
        : claim.status === 'partially_approved' ? 'bg-amber-400'
        : claim.status === 'submitted' ? 'bg-blue-400'
        : 'bg-gray-200'
      }`} />
    </motion.div>
  );
}

export default function MyClaims() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: mainClaims = [], isLoading } = useQuery({
    queryKey: ['my-main-claims', user?.email],
    queryFn: () => base44.entities.MainClaim.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const filtered = mainClaims.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!c.claim_number?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" className="mb-2 -ml-2 text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My Claims</h1>
            <p className="text-gray-500 text-sm mt-1">View and manage all your expense claims</p>
          </div>
          <Link to="/claims/new">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              <Plus className="w-5 h-5 mr-2" /> New Claim
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by claim number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
            <span>Showing {filtered.length} of {mainClaims.length} claims</span>
            <span className="font-medium text-gray-700">Total: ₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
              <p className="text-gray-500 mb-6">
                {mainClaims.length === 0 ? "You haven't submitted any claims yet" : "Try adjusting your filters"}
              </p>
              <Link to="/claims/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Submit Your First Claim
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filtered.map(claim => (
                <MainClaimCard key={claim.id} claim={claim} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}