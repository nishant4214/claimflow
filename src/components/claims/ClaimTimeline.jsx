import React from 'react';
import { format, parseISO } from 'date-fns';
import { 
  CheckCircle, XCircle, Clock, Send, 
  ArrowRight, AlertCircle, Banknote, Pause 
} from "lucide-react";
import { motion } from "framer-motion";

const actionIcons = {
  approved: CheckCircle,
  rejected: XCircle,
  sent_back: AlertCircle,
  paid: Banknote,
  on_hold: Pause,
  submitted: Send,
};

const actionColors = {
  approved: 'text-green-600 bg-green-100',
  rejected: 'text-red-600 bg-red-100',
  sent_back: 'text-amber-600 bg-amber-100',
  paid: 'text-emerald-600 bg-emerald-100',
  on_hold: 'text-orange-600 bg-orange-100',
  submitted: 'text-blue-600 bg-blue-100',
};

export default function ClaimTimeline({ logs, claim }) {
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.created_date) - new Date(b.created_date)
  );

  return (
    <div className="relative">
      {/* Initial submission */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-4 pb-8"
      >
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionColors.submitted}`}>
            <Send className="w-5 h-5" />
          </div>
          {sortedLogs.length > 0 && (
            <div className="w-0.5 flex-1 bg-gradient-to-b from-blue-200 to-gray-200 mt-2" />
          )}
        </div>
        <div className="flex-1 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Claim Submitted</span>
            <span className="text-xs text-gray-500">
              {claim.created_date && format(parseISO(claim.created_date), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Submitted by {claim.employee_name}
          </p>
        </div>
      </motion.div>

      {/* Approval logs */}
      {sortedLogs.map((log, index) => {
        const Icon = actionIcons[log.action] || Clock;
        const isLast = index === sortedLogs.length - 1;
        
        return (
          <motion.div 
            key={log.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (index + 1) * 0.1 }}
            className="flex gap-4 pb-8"
          >
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionColors[log.action] || 'text-gray-600 bg-gray-100'}`}>
                <Icon className="w-5 h-5" />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-200 to-gray-100 mt-2" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 capitalize">
                  {log.action.replace('_', ' ')}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                  {log.stage?.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-500">
                  {log.created_date && format(parseISO(log.created_date), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                By {log.approver_name || 'System'} ({log.approver_role?.replace('_', ' ')})
              </p>
              {log.remarks && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-700">{log.remarks}</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Current stage indicator */}
      {!['paid', 'rejected'].includes(claim.status) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 border-2 border-blue-300 border-dashed">
              <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <span className="font-medium text-blue-600">
              Awaiting {claim.current_approver_role?.replace('_', ' ')} action
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}