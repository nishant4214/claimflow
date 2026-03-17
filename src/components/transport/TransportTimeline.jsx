import React from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Clock, Circle, XCircle, AlertCircle } from 'lucide-react';

function TimelineStep({ label, status, timestamp, byName, byRole, remarks, isSkipped }) {
  let icon, colorClass;

  if (isSkipped) {
    icon = <Circle className="w-4 h-4 text-gray-300" />;
    colorClass = 'text-gray-400';
  } else if (status === 'approved') {
    icon = <CheckCircle className="w-4 h-4 text-green-600" />;
    colorClass = 'text-green-700';
  } else if (status === 'rejected') {
    icon = <XCircle className="w-4 h-4 text-red-600" />;
    colorClass = 'text-red-700';
  } else if (status === 'sent_back') {
    icon = <AlertCircle className="w-4 h-4 text-amber-600" />;
    colorClass = 'text-amber-700';
  } else if (status === 'active') {
    icon = <Clock className="w-4 h-4 text-blue-600 animate-pulse" />;
    colorClass = 'text-blue-700';
  } else {
    icon = <Circle className="w-4 h-4 text-gray-300" />;
    colorClass = 'text-gray-400';
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="mt-1">{icon}</div>
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-4 flex-1">
        <p className={`text-sm font-medium ${colorClass}`}>{label}</p>
        {isSkipped && <p className="text-xs text-gray-400 mt-0.5">Skipped (created by manager/admin)</p>}
        {timestamp && (
          <p className="text-xs text-gray-500 mt-0.5">
            {format(parseISO(timestamp), 'dd MMM yyyy, hh:mm a')}
          </p>
        )}
        {byName && (
          <p className="text-xs text-gray-500">
            By: {byName} {byRole ? `(${byRole.replace('_', ' ')})` : ''}
          </p>
        )}
        {remarks && remarks !== 'Request submitted' && remarks !== 'Manager approval skipped (created by manager/admin)' && (
          <p className="text-xs text-gray-500 italic mt-0.5">"{remarks}"</p>
        )}
      </div>
    </div>
  );
}

export default function TransportTimeline({ request }) {
  if (!request) return null;

  const history = request.history || [];
  const submittedEntry = history.find(h => h.action === 'submitted');
  const managerSkipped = history.some(h => h.action === 'manager_skipped');
  const managerEntry = history.find(h => h.action === 'manager_approved');
  const managerRejected = history.find(h => h.action === 'manager_rejected' || h.action === 'manager_sent_back');
  const leadEntry = history.find(h => h.action === 'lead_approved' || h.action === 'lead_rejected' || h.action === 'lead_sent_back');

  const getManagerStatus = () => {
    if (managerSkipped) return 'skipped';
    if (managerEntry) return 'approved';
    if (managerRejected) return managerRejected.action.includes('rejected') ? 'rejected' : 'sent_back';
    if (request.stage === 'manager' && request.status === 'pending_manager') return 'active';
    return 'pending';
  };

  const getLeadStatus = () => {
    if (!leadEntry) {
      if (request.stage === 'lead') return 'active';
      return 'pending';
    }
    if (leadEntry.action === 'lead_approved') return 'approved';
    if (leadEntry.action === 'lead_rejected') return 'rejected';
    return 'sent_back';
  };

  const managerStatus = getManagerStatus();
  const leadStatus = getLeadStatus();

  // Awaiting time
  const createdAt = request.created_date ? parseISO(request.created_date) : null;
  const now = new Date();
  const awaitingHours = createdAt ? Math.floor((now - createdAt) / 1000 / 3600) : 0;
  const awaitingText = awaitingHours < 24
    ? `${awaitingHours}h`
    : `${Math.floor(awaitingHours / 24)}d ${awaitingHours % 24}h`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Approval Timeline</p>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          Awaiting: {awaitingText} | Stage: {request.stage}
        </div>
      </div>

      <div className="space-y-0">
        <TimelineStep
          label="Request Submitted"
          status="approved"
          timestamp={submittedEntry?.timestamp}
          byName={submittedEntry?.by_name}
          byRole={submittedEntry?.by_role}
          remarks={null}
        />

        <TimelineStep
          label="Manager Approval"
          status={managerStatus === 'skipped' ? null : managerStatus}
          isSkipped={managerStatus === 'skipped'}
          timestamp={managerEntry?.timestamp || managerRejected?.timestamp}
          byName={managerEntry?.by_name || managerRejected?.by_name}
          byRole={managerEntry?.by_role || managerRejected?.by_role}
          remarks={managerEntry?.remarks || managerRejected?.remarks}
        />

        <TimelineStep
          label="Admin Head Approval"
          status={leadStatus}
          timestamp={leadEntry?.timestamp}
          byName={leadEntry?.by_name}
          byRole={leadEntry?.by_role}
          remarks={leadEntry?.remarks}
        />
      </div>
    </div>
  );
}