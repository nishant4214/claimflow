import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Car, User, Building2, Briefcase,
  CheckCircle2, Clock, XCircle, CornerUpLeft, Send
} from "lucide-react";
import { format, parseISO, formatDistanceStrict } from 'date-fns';
import TransportStatusBadge from '../components/transport/TransportStatusBadge';

// ── Timeline helpers ──────────────────────────────────────────────────────────
function timelineSteps(req) {
  const history = req.history || [];

  const find = (keys) =>
    history.find((h) => keys.some((k) => h.action?.includes(k)));

  const submitted  = find(['submitted', 'created']);
  const mgr        = find(['manager']);
  const lead       = find(['lead']);

  const isManagerSkipped =
    req.created_by_role === 'manager' ||
    req.created_by_role === 'admin_head' ||
    req.created_by_role === 'admin';

  return [
    {
      label: 'Request Submitted',
      entry: submitted || history[0] || null,
      status: 'done',
    },
    {
      label: 'Manager Approval',
      entry: mgr,
      status: isManagerSkipped
        ? 'skipped'
        : mgr
        ? mgr.action?.includes('reject') || mgr.action?.includes('sent_back')
          ? 'rejected'
          : 'done'
        : req.stage === 'manager'
        ? 'active'
        : 'pending',
      skippedReason: isManagerSkipped ? 'Skipped (created by manager/admin)' : null,
    },
    {
      label: 'Admin Head Approval',
      entry: lead,
      status: lead
        ? lead.action?.includes('reject') || lead.action?.includes('sent_back')
          ? 'rejected'
          : 'done'
        : req.stage === 'lead'
        ? 'active'
        : req.status === 'approved'
        ? 'done'
        : 'pending',
    },
  ];
}

const STEP_ICON = {
  done:     <CheckCircle2 className="w-5 h-5 text-green-500" />,
  active:   <Clock        className="w-5 h-5 text-blue-500 animate-pulse" />,
  pending:  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />,
  skipped:  <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-gray-100" />,
  rejected: <XCircle      className="w-5 h-5 text-red-500" />,
};

function TimelineStep({ step }) {
  const { label, entry, status, skippedReason } = step;
  const isDone    = status === 'done';
  const isActive  = status === 'active';
  const isSkipped = status === 'skipped';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="mt-0.5">{STEP_ICON[status] || STEP_ICON.pending}</div>
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-6">
        <p className={`font-semibold text-sm ${
          isDone   ? 'text-green-700' :
          isActive ? 'text-blue-700' :
          isSkipped? 'text-gray-400' :
          status === 'rejected' ? 'text-red-600' :
          'text-gray-400'
        }`}>
          {label}
        </p>
        {skippedReason && (
          <p className="text-xs text-gray-400 mt-0.5">{skippedReason}</p>
        )}
        {entry && !isSkipped && (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500">
              {entry.timestamp
                ? format(parseISO(entry.timestamp), 'dd MMM yyyy, hh:mm a')
                : '—'}
            </p>
            {entry.by_name && (
              <p className="text-xs text-gray-500">
                By: {entry.by_name}
                {entry.by_role ? ` (${entry.by_role.replace('_', ' ')})` : ''}
              </p>
            )}
            {entry.remarks && (
              <p className="text-xs italic text-gray-400">"{entry.remarks}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TransportRequestDetails() {
  const [user, setUser] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('id');
  const from = params.get('from') || 'Approvals';

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: req, isLoading, refetch } = useQuery({
    queryKey: ['transport-detail', requestId],
    queryFn: () => base44.entities.TransportRequest.filter({ id: requestId }).then((r) => r[0]),
    enabled: !!requestId,
    refetchInterval: 5000,
  });

  // Real-time subscription for live status updates
  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = base44.entities.TransportRequest.subscribe((event) => {
      if (event.id === requestId) refetch();
    });
    return () => unsubscribe();
  }, [requestId]);

  if (isLoading || !req) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const steps = timelineSteps(req);
  const history = req.history || [];
  const submittedEntry = history[0];
  const elapsed = submittedEntry?.timestamp
    ? formatDistanceStrict(new Date(), parseISO(submittedEntry.timestamp))
    : null;

  const stageLabelMap = { manager: 'Manager', lead: 'Admin Head', completed: 'Completed' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Back Button */}
        <Link to={createPageUrl(from)}>
          <Button variant="ghost" className="mb-6 text-gray-600 hover:text-gray-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {from === 'Approvals' ? 'Back to Approvals' : from === 'TransportAccess' ? 'Back to My Requests' : 'Back'}
          </Button>
        </Link>

        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Car className="w-6 h-6 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">{req.tar_number}</h1>
              <TransportStatusBadge status={req.status} />
            </div>
            <p className="text-gray-500 text-sm ml-9">
              Transport Access — {req.transport_type} &bull; {req.department}
            </p>
          </div>
          {elapsed && (
            <div className="text-sm text-gray-400">
              Submitted {elapsed} ago
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column — Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Request Details Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Employee Name</p>
                    <p className="font-semibold text-gray-900">{req.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Department</p>
                    <p className="font-semibold text-gray-900">{req.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Employee Email</p>
                    <p className="font-semibold text-gray-900 text-sm break-all">{req.employee_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Manager</p>
                    <p className="font-semibold text-gray-900">{req.manager_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Transport Type</p>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 mt-0.5">
                      {req.transport_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Current Status</p>
                    <TransportStatusBadge status={req.status} />
                  </div>
                  {req.effective_date && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Effective Date</p>
                      <p className="font-semibold text-gray-900">
                        {format(parseISO(req.effective_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  )}
                  {req.created_date && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Submitted On</p>
                      <p className="font-semibold text-gray-900">
                        {format(parseISO(req.created_date), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Business Justification */}
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Business Justification</p>
                  <p className="text-gray-800 leading-relaxed">{req.business_justification}</p>
                </div>
              </CardContent>
            </Card>

            {/* Rejection / Send-back Reason */}
            {(req.rejection_reason || req.send_back_reason) && (
              <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold uppercase text-red-500 mb-1">
                    {req.rejection_reason ? 'Rejection Reason' : 'Send-Back Reason'}
                  </p>
                  <p className="text-gray-700 text-sm">
                    {req.rejection_reason || req.send_back_reason}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column — Submitter + Timeline */}
          <div className="space-y-6">

            {/* Submitted By */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Submitted By</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                    {req.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{req.employee_name}</p>
                    <p className="text-xs text-gray-400">{req.employee_email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {req.department}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    {req.created_by_role?.replace('_', ' ') || 'Employee'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Timeline */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-700">
                    Approval Timeline
                  </CardTitle>
                  {elapsed && (
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-1">
                      Awaiting: {elapsed} | Stage: {stageLabelMap[req.stage] || req.stage}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {steps.map((step, i) => (
                  <TimelineStep key={i} step={step} />
                ))}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}