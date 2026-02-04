import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO } from 'date-fns';
import { Eye, FileText, Calendar, IndianRupee, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ClaimStatusBadge from './ClaimStatusBadge';
import SLAIndicator from './SLAIndicator';
import { motion } from "framer-motion";

export default function ClaimCard({ claim, showActions = true }) {
  const canEdit = claim.status === 'sent_back' || claim.status === 'draft';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Left accent bar */}
            <div className={`w-full sm:w-1.5 h-1.5 sm:h-auto ${
              claim.claim_type === 'sales_promotion' 
                ? 'bg-gradient-to-r sm:bg-gradient-to-b from-purple-500 to-pink-500' 
                : 'bg-gradient-to-r sm:bg-gradient-to-b from-blue-500 to-cyan-500'
            }`} />
            
            <div className="flex-1 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-3 flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {claim.claim_number || `CLM-${claim.id?.slice(-6)}`}
                        </span>
                        <ClaimStatusBadge status={claim.status} />
                        {claim.claim_type === 'sales_promotion' && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                            Sales Promotion
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mt-1.5 line-clamp-1">
                        {claim.purpose}
                      </h3>
                    </div>
                    
                    {claim.sla_date && !['paid', 'rejected'].includes(claim.status) && (
                      <SLAIndicator 
                        slaDate={claim.sla_date} 
                        submissionDate={claim.created_date} 
                      />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span>{claim.category_name || 'Uncategorized'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{claim.expense_date && format(parseISO(claim.expense_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>Bill: {claim.bill_number}</span>
                    </div>
                  </div>
                </div>
                
                {/* Amount & Actions */}
                <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                  <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                    <IndianRupee className="w-5 h-5" />
                    <span>{claim.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {showActions && (
                    <div className="flex gap-2">
                      {canEdit && (
                        <Link to={createPageUrl(`SubmitClaim?edit=${claim.id}`)}>
                          <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
                            <FileText className="w-4 h-4" />
                            Edit & Resubmit
                          </Button>
                        </Link>
                      )}
                      <Link to={createPageUrl(`ClaimDetails?id=${claim.id}`)}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}