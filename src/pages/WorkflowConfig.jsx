import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Trash2, GripVertical, ArrowRight, Save,
  AlertCircle, ArrowLeft, Settings, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const AVAILABLE_ROLES = [
  { value: 'junior_admin', label: 'Junior Admin' },
  { value: 'manager', label: 'Manager/HOD' },
  { value: 'admin_head', label: 'Admin Head' },
  { value: 'cro', label: 'CRO' },
  { value: 'cfo', label: 'CFO' },
  { value: 'finance', label: 'Finance' },
];

const DEFAULT_NORMAL_WORKFLOW = {
  workflow_type: 'normal',
  workflow_name: 'Normal Reimbursement Workflow',
  stages: [
    { stage_order: 1, stage_name: 'Verification', approver_role: 'junior_admin', status_on_approve: 'verified', is_active: true, can_skip_for_torch_bearer: false },
    { stage_order: 2, stage_name: 'Manager Approval', approver_role: 'manager', status_on_approve: 'manager_approved', is_active: true, can_skip_for_torch_bearer: true },
    { stage_order: 3, stage_name: 'Admin Head Approval', approver_role: 'admin_head', status_on_approve: 'admin_approved', is_active: true, can_skip_for_torch_bearer: false },
  ],
  sla_days: 45,
  sla_warning_days: 3,
  is_active: true,
};

const DEFAULT_SALES_WORKFLOW = {
  workflow_type: 'sales_promotion',
  workflow_name: 'Sales Promotion Workflow',
  stages: [
    { stage_order: 1, stage_name: 'Manager Approval', approver_role: 'manager', status_on_approve: 'manager_approved', is_active: true, can_skip_for_torch_bearer: false },
    { stage_order: 2, stage_name: 'CRO Approval', approver_role: 'cro', status_on_approve: 'cro_approved', is_active: true, can_skip_for_torch_bearer: false },
    { stage_order: 3, stage_name: 'CFO Approval', approver_role: 'cfo', status_on_approve: 'cfo_approved', is_active: true, can_skip_for_torch_bearer: false },
  ],
  sla_days: 45,
  sla_warning_days: 3,
  is_active: true,
};

export default function WorkflowConfigPage() {
  const [user, setUser] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState('normal');
  const [workflowData, setWorkflowData] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflow-configs'],
    queryFn: () => base44.entities.WorkflowConfig.list(),
  });

  useEffect(() => {
    const workflow = workflows.find(w => w.workflow_type === selectedWorkflow);
    if (workflow) {
      setWorkflowData(workflow);
    } else {
      setWorkflowData(selectedWorkflow === 'normal' ? DEFAULT_NORMAL_WORKFLOW : DEFAULT_SALES_WORKFLOW);
    }
  }, [workflows, selectedWorkflow]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = workflows.find(w => w.workflow_type === data.workflow_type);
      if (existing) {
        return base44.entities.WorkflowConfig.update(existing.id, data);
      } else {
        return base44.entities.WorkflowConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workflow-configs']);
      toast.success('Workflow configuration saved');
    },
  });

  const addStage = () => {
    const newStage = {
      stage_order: workflowData.stages.length + 1,
      stage_name: 'New Stage',
      approver_role: 'manager',
      status_on_approve: `stage_${workflowData.stages.length + 1}_approved`,
      is_active: true,
      can_skip_for_torch_bearer: false,
    };
    setWorkflowData(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
  };

  const removeStage = (index) => {
    setWorkflowData(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, stage_order: i + 1 }))
    }));
  };

  const updateStage = (index, field, value) => {
    setWorkflowData(prev => ({
      ...prev,
      stages: prev.stages.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const handleReorder = (newOrder) => {
    setWorkflowData(prev => ({
      ...prev,
      stages: newOrder.map((s, i) => ({ ...s, stage_order: i + 1 }))
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(workflowData);
  };

  const userRole = user?.portal_role;
  if (userRole !== 'admin_head' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500">Only Admin Head can configure workflows.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="mt-6" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!workflowData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workflow Configuration</h1>
          <p className="text-gray-500 mt-1">
            Configure approval stages and SLA settings for claim workflows
          </p>
        </div>

        {/* Workflow Selector */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label>Select Workflow</Label>
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Reimbursement</SelectItem>
                  <SelectItem value="sales_promotion">Sales Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Settings */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              {workflowData.workflow_name}
            </CardTitle>
            <CardDescription>
              Configure the approval stages for this workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SLA Settings */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label>SLA Days</Label>
                <Input
                  type="number"
                  value={workflowData.sla_days}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, sla_days: parseInt(e.target.value) || 45 }))}
                />
                <p className="text-xs text-gray-500">Total days allowed for claim processing</p>
              </div>
              <div className="space-y-2">
                <Label>Warning Days Before SLA</Label>
                <Input
                  type="number"
                  value={workflowData.sla_warning_days}
                  onChange={(e) => setWorkflowData(prev => ({ ...prev, sla_warning_days: parseInt(e.target.value) || 3 }))}
                />
                <p className="text-xs text-gray-500">Days before SLA to show warning</p>
              </div>
            </div>

            {/* Approval Stages */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Approval Stages</Label>
                <Button variant="outline" size="sm" onClick={addStage}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Stage
                </Button>
              </div>

              <Reorder.Group 
                axis="y" 
                values={workflowData.stages} 
                onReorder={handleReorder}
                className="space-y-3"
              >
                <AnimatePresence>
                  {workflowData.stages.map((stage, index) => (
                    <Reorder.Item
                      key={stage.stage_order}
                      value={stage}
                      className="bg-white border rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="cursor-grab pt-2">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-blue-600">
                              Stage {index + 1}
                            </Badge>
                            <Input
                              value={stage.stage_name}
                              onChange={(e) => updateStage(index, 'stage_name', e.target.value)}
                              className="max-w-xs"
                              placeholder="Stage name"
                            />
                            {index < workflowData.stages.length - 1 && (
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Approver Role</Label>
                              <Select 
                                value={stage.approver_role}
                                onValueChange={(v) => updateStage(index, 'approver_role', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={stage.is_active}
                                onCheckedChange={(v) => updateStage(index, 'is_active', v)}
                              />
                              <Label className="text-sm">Active</Label>
                            </div>
                            
                            {selectedWorkflow === 'normal' && (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={stage.can_skip_for_torch_bearer}
                                  onCheckedChange={(v) => updateStage(index, 'can_skip_for_torch_bearer', v)}
                                />
                                <Label className="text-xs">Skip for Torch Bearer</Label>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeStage(index)}
                          disabled={workflowData.stages.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </div>

            {/* Visual Flow */}
            <div className="pt-4 border-t">
              <Label className="text-sm text-gray-500 mb-3 block">Approval Flow Preview</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-100 text-blue-700">Employee Submits</Badge>
                {workflowData.stages.filter(s => s.is_active).map((stage, index, arr) => (
                  <React.Fragment key={stage.stage_order}>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <Badge className={stage.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                      {stage.stage_name}
                    </Badge>
                  </React.Fragment>
                ))}
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <Badge className="bg-emerald-100 text-emerald-700">Finance Payment</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}