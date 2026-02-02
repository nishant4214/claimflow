import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  Clock, CheckCircle, XCircle, AlertCircle, 
  Send, FileCheck, Banknote, Pause 
} from "lucide-react";

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: Send },
  verified: { label: 'Verified', color: 'bg-indigo-100 text-indigo-700', icon: FileCheck },
  sent_back: { label: 'Sent Back', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  manager_approved: { label: 'Manager Approved', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  admin_approved: { label: 'Admin Approved', color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
  cro_approved: { label: 'CRO Approved', color: 'bg-cyan-100 text-cyan-700', icon: CheckCircle },
  cfo_approved: { label: 'CFO Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: Banknote },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-700', icon: Pause },
};

export default function ClaimStatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;
  
  return (
    <Badge 
      className={`${config.color} font-medium ${size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'}`}
      variant="secondary"
    >
      <Icon className={`${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} mr-1.5`} />
      {config.label}
    </Badge>
  );
}