import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, ArrowLeft, Car } from "lucide-react";
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import TransportStatusBadge from './TransportStatusBadge';

// Derive SLA-like indicator from createdAt (7 days SLA for transport)
function TransportSLA({ createdAt }) {
  if (!createdAt) return null;
  const created = parseISO(createdAt);
  const slaDate = new Date(created);
  slaDate.setDate(slaDate.getDate() + 7);
  const daysRemaining = differenceInDays(slaDate, new Date());

  let color = 'text-green-600 bg-green-50';
  let label = `${daysRemaining}d left`;
  if (daysRemaining <= 1) { color = 'text-red-600 bg-red-50'; label = daysRemaining <= 0 ? 'Overdue!' : `${daysRemaining}d - Urgent!`; }
  else if (daysRemaining <= 3) { color = 'text-amber-600 bg-amber-50'; }

  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function TransportApprovalRows({ requests, tab, userRole, onAction }) {
  return requests.map((req, index) => (
    <motion.tr
      key={req.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-b hover:bg-gray-50 transition-colors bg-blue-50/20"
    >
      <TableCell className="font-mono text-sm font-medium">
        {req.tar_number}
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{req.employee_name}</p>
          <p className="text-xs text-gray-500">{req.department}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="line-clamp-1 max-w-[200px] text-sm">{req.business_justification}</span>
      </TableCell>
      <TableCell className="text-gray-400 text-sm">—</TableCell>
      <TableCell>
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 gap-1">
          <Car className="w-3 h-3" />
          Transport ({req.transport_type})
        </Badge>
      </TableCell>
      <TableCell>
        <TransportStatusBadge status={req.status} />
      </TableCell>
      <TableCell>
        <TransportSLA createdAt={req.created_date} />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {/* View button placeholder — inline in row */}
          {tab === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => onAction(req, 'approve')}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => onAction(req, 'send_back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onAction(req, 'reject')}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </motion.tr>
  ));
}