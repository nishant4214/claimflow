import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Send } from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TransportRequestForm({ user, onSuccess }) {
  const queryClient = useQueryClient();
  const userRole = user?.portal_role || user?.role || 'employee';

  const [form, setForm] = useState({
    employee_id: user?.employee_id || '',
    employee_name: user?.full_name || '',
    employee_email: user?.email || '',
    department: user?.department || '',
    manager_name: '',
    transport_type: '',
    business_justification: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TransportRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transport-requests']);
      queryClient.invalidateQueries(['transport-approvals']);
      toast.success('Transport Access request submitted successfully!');
      setForm(f => ({
        ...f,
        manager_name: '',
        transport_type: '',
        business_justification: '',
      }));
      if (onSuccess) onSuccess();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.employee_name || !form.department ||
        !form.manager_name || !form.transport_type || !form.business_justification) {
      toast.error('Please fill in all mandatory fields.');
      return;
    }

    // Determine stage based on creator role
    // Manager or Admin Head → skip manager approval, go directly to lead
    const isManagerOrAdmin = ['manager', 'admin_head', 'admin'].includes(userRole);
    const stage = isManagerOrAdmin ? 'lead' : 'manager';
    const status = isManagerOrAdmin ? 'pending_lead' : 'pending_manager';

    // Generate TAR number
    const tarNumber = `TAR-${Date.now().toString().slice(-6)}`;

    const initialHistory = [{
      action: 'submitted',
      by_name: user?.full_name,
      by_email: user?.email,
      by_role: userRole,
      remarks: 'Request submitted',
      timestamp: new Date().toISOString(),
    }];

    if (isManagerOrAdmin) {
      initialHistory.push({
        action: 'manager_skipped',
        by_name: user?.full_name,
        by_email: user?.email,
        by_role: userRole,
        remarks: 'Manager approval skipped (created by manager/admin)',
        timestamp: new Date().toISOString(),
      });
    }

    createMutation.mutate({
      ...form,
      tar_number: tarNumber,
      status,
      stage,
      created_by_role: userRole,
      history: initialHistory,
    });
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="w-5 h-5 text-blue-600" />
          New Transport Access Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Employee ID *</label>
            <Input
              value={form.employee_id}
              onChange={e => set('employee_id', e.target.value)}
              placeholder="e.g. EMP001"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Employee Name *</label>
            <Input
              value={form.employee_name}
              onChange={e => set('employee_name', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Department *</label>
            <Input
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="e.g. Sales"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Manager Name *</label>
            <Input
              value={form.manager_name}
              onChange={e => set('manager_name', e.target.value)}
              placeholder="Reporting manager"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Transport Request *</label>
            <Select value={form.transport_type} onValueChange={v => set('transport_type', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OLA">OLA</SelectItem>
                <SelectItem value="Uber">Uber</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Business Justification *</label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              value={form.business_justification}
              onChange={e => set('business_justification', e.target.value)}
              placeholder="Explain the business need for this transport access..."
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}