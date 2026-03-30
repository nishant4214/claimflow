import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_ROUTES = [
  'Dashboard', 'MyClaims', 'NewClaim', 'ConferenceRooms', 'TransportAccess', 'Notifications', 'MyAccount',
  'Approvals', 'Finance', 'RoomFeedbackDashboard', 'HousekeepingDashboard', 'AdminRooms', 'BulkUpload',
  'AdminCategories', 'WorkflowConfig', 'Reports', 'AllUsers', 'RoleAccessManagement', 'UserManagement'
];

const AVAILABLE_ACTIONS = [
  'claim:create', 'claim:view_own', 'claim:view_all', 'claim:approve_manager', 'claim:approve_admin',
  'claim:approve_cro', 'claim:approve_cfo', 'claim:process_payment', 'claim:verify',
  'booking:create', 'booking:approve',
  'category:manage', 'workflow:manage', 'users:manage'
];

const ALL_ROLES = ['employee', 'junior_admin', 'manager', 'admin_head', 'functional_lead', 'cro', 'cfo', 'finance', 'admin'];

export default function RolePermissionManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    role_name: '',
    display_label: '',
    accessible_routes: [],
    allowed_actions: [],
    description: '',
  });
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['role-configs'],
    queryFn: () => base44.asServiceRole.entities.RoleConfig.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.RoleConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['role-configs']);
      toast.success('Role configuration created');
      closeDialog();
    },
    onError: (error) => toast.error('Failed to create: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.RoleConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['role-configs']);
      toast.success('Role configuration updated');
      closeDialog();
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.asServiceRole.entities.RoleConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['role-configs']);
      toast.success('Role configuration deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const openDialog = (role = null) => {
    if (role) {
      setSelectedRole(role);
      setFormData({
        role_name: role.role_name,
        display_label: role.display_label,
        accessible_routes: role.accessible_routes || [],
        allowed_actions: role.allowed_actions || [],
        description: role.description || '',
      });
    } else {
      setSelectedRole(null);
      setFormData({
        role_name: '',
        display_label: '',
        accessible_routes: [],
        allowed_actions: [],
        description: '',
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setSelectedRole(null);
  };

  const handleSubmit = () => {
    if (!formData.role_name || !formData.display_label) {
      toast.error('Role name and display label are required');
      return;
    }

    if (selectedRole) {
      updateMutation.mutate({ id: selectedRole.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleRoute = (route) => {
    setFormData(prev => ({
      ...prev,
      accessible_routes: prev.accessible_routes.includes(route)
        ? prev.accessible_routes.filter(r => r !== route)
        : [...prev.accessible_routes, route]
    }));
  };

  const toggleAction = (action) => {
    setFormData(prev => ({
      ...prev,
      allowed_actions: prev.allowed_actions.includes(action)
        ? prev.allowed_actions.filter(a => a !== action)
        : [...prev.allowed_actions, action]
    }));
  };

  if (isLoading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>;
  }

  const usedRoles = new Set(configs.map(c => c.role_name));
  const unusedRoles = ALL_ROLES.filter(r => !usedRoles.has(r));

  return (
    <div className="space-y-6">
      {configs.length === 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 ml-2">
            No custom role configurations exist. System will use built-in defaults.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700" disabled={unusedRoles.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Add Role Configuration
        </Button>
      </div>

      <div className="grid gap-4">
        {configs.map(config => (
          <Card key={config.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{config.display_label}</h3>
                    <Badge variant="outline" className="text-xs">{config.role_name}</Badge>
                  </div>
                  {config.description && <p className="text-sm text-gray-600 mb-3">{config.description}</p>}
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Routes ({config.accessible_routes?.length || 0})</p>
                      <div className="flex flex-wrap gap-1">
                        {config.accessible_routes?.slice(0, 5).map(r => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                        {config.accessible_routes?.length > 5 && <Badge variant="secondary" className="text-xs">+{config.accessible_routes.length - 5}</Badge>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Actions ({config.allowed_actions?.length || 0})</p>
                      <div className="flex flex-wrap gap-1">
                        {config.allowed_actions?.slice(0, 5).map(a => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                        {config.allowed_actions?.length > 5 && <Badge variant="secondary" className="text-xs">+{config.allowed_actions.length - 5}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => openDialog(config)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => {
                    if (confirm(`Delete configuration for ${config.display_label}?`)) {
                      deleteMutation.mutate(config.id);
                    }
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role Configuration' : 'Add Role Configuration'}</DialogTitle>
            <DialogDescription>Configure permissions and accessible routes for a role</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
            <div>
              <Label>Role *</Label>
              <Select value={formData.role_name} onValueChange={(val) => setFormData(p => ({ ...p, role_name: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedRole ? ALL_ROLES : unusedRoles).map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Display Label *</Label>
              <Input placeholder="e.g., Admin Head" value={formData.display_label} 
                onChange={(e) => setFormData(p => ({ ...p, display_label: e.target.value }))} />
            </div>

            <div>
              <Label>Description</Label>
              <Input placeholder="Role description" value={formData.description} 
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Label className="font-semibold mb-3 block">Accessible Routes</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_ROUTES.map(route => (
                  <button
                    key={route}
                    onClick={() => toggleRoute(route)}
                    className={`text-left px-3 py-2 rounded-lg border transition ${
                      formData.accessible_routes.includes(route)
                        ? 'bg-blue-100 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm">{route}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold mb-3 block">Allowed Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_ACTIONS.map(action => (
                  <button
                    key={action}
                    onClick={() => toggleAction(action)}
                    className={`text-left px-3 py-2 rounded-lg border transition ${
                      formData.allowed_actions.includes(action)
                        ? 'bg-green-100 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm">{action}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}