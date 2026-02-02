import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { 
  Plus, Search, CalendarIcon, Filter, 
  FileText, Download, ArrowLeft, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClaimCard from '../components/claims/ClaimCard';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'sent_back', label: 'Sent Back' },
  { value: 'manager_approved', label: 'Manager Approved' },
  { value: 'admin_approved', label: 'Admin Approved' },
  { value: 'cro_approved', label: 'CRO Approved' },
  { value: 'cfo_approved', label: 'CFO Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'on_hold', label: 'On Hold' },
];

const CLAIM_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'normal', label: 'Normal Reimbursement' },
  { value: 'sales_promotion', label: 'Sales Promotion' },
];

export default function MyClaims() {
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    claim_type: 'all',
    search: '',
    dateFrom: null,
    dateTo: null,
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['my-claims', user?.email],
    queryFn: () => base44.entities.Claim.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.filter({ is_active: true }),
  });

  const filteredClaims = claims.filter(claim => {
    if (filters.status !== 'all' && claim.status !== filters.status) return false;
    if (filters.claim_type !== 'all' && claim.claim_type !== filters.claim_type) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (
        !claim.claim_number?.toLowerCase().includes(search) &&
        !claim.purpose?.toLowerCase().includes(search) &&
        !claim.category_name?.toLowerCase().includes(search)
      ) return false;
    }
    if (filters.dateFrom && new Date(claim.expense_date) < filters.dateFrom) return false;
    if (filters.dateTo && new Date(claim.expense_date) > filters.dateTo) return false;
    return true;
  });

  const clearFilters = () => {
    setFilters({
      status: 'all',
      claim_type: 'all',
      search: '',
      dateFrom: null,
      dateTo: null,
    });
  };

  const hasActiveFilters = filters.status !== 'all' || 
    filters.claim_type !== 'all' || 
    filters.search || 
    filters.dateFrom || 
    filters.dateTo;

  const totalAmount = filteredClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" className="mb-2 -ml-2 text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">My Claims</h1>
            <p className="text-gray-500 mt-1">
              View and manage all your expense claims
            </p>
          </div>
          <Link to={createPageUrl('SubmitClaim')}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              <Plus className="w-5 h-5 mr-2" />
              New Claim
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Filters</span>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by claim #, purpose..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Status */}
              <Select 
                value={filters.status} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Claim Type */}
              <Select 
                value={filters.claim_type} 
                onValueChange={(v) => setFilters(prev => ({ ...prev, claim_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Claim Type" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start font-normal">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {filters.dateFrom && filters.dateTo
                      ? `${format(filters.dateFrom, 'MMM d')} - ${format(filters.dateTo, 'MMM d')}`
                      : 'Date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: filters.dateFrom, to: filters.dateTo }}
                    onSelect={(range) => setFilters(prev => ({
                      ...prev,
                      dateFrom: range?.from || null,
                      dateTo: range?.to || null,
                    }))}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Showing {filteredClaims.length} of {claims.length} claims
            {filteredClaims.length > 0 && (
              <span className="ml-2 font-medium text-gray-700">
                • Total: ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            )}
          </p>
        </div>

        {/* Claims List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredClaims.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
              <p className="text-gray-500 mb-6">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results'
                  : "You haven't submitted any claims yet"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Link to={createPageUrl('SubmitClaim')}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Your First Claim
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredClaims.map((claim, index) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}