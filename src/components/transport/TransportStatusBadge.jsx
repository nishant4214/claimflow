import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle, UserCheck } from "lucide-react";

const statusConfig = {
  pending_manager: { label: 'Pending - Manager Approval', color: 'bg-blue-100 text-blue-700', icon: Clock },
  pending_lead: { label: 'Pending - Admin Head Approval', color: 'bg-purple-100 text-purple-700', icon: UserCheck },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  sent_back: { label: 'Clarification Required', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export default function TransportStatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.pending_manager;
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