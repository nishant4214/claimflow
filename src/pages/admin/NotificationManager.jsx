import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const EVENT_TYPES = [
  'CLAIM_APPROVED', 'CLAIM_REJECTED', 'CLAIM_SENT_BACK',
  'ROOM_APPROVED', 'ROOM_REJECTED', 'ROOM_SENT_BACK',
  'TRANSPORT_APPROVED', 'TRANSPORT_REJECTED', 'TRANSPORT_SENT_BACK'
];

export default function NotificationManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [formData, setFormData] = useState({
    is_enabled: true,
    send_to_recipient: true,
    send_to_manager: false,
    send_to_approver: false,
    additional_recipients: '',
    delay_minutes: 0,
    retry_count: 3,
    description: '',
  });

  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['notification-configs'],
    queryFn: () => base44.asServiceRole.entities.NotificationConfig.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.NotificationConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-configs']);
      toast.success('Notification config created');
      closeDialog();
    },
    onError: (error) => toast.error('Failed to create: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.asServiceRole.entities.NotificationConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notification-configs']);
      toast.success('Notification config updated');
      closeDialog();
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const openDialog = (config = null, eventType = null) => {
    if (config) {
      setSelectedConfig(config);
      setFormData({
        event_type: config.event_type,
        is_enabled: config.is_enabled ?? true,
        send_to_recipient: config.send_to_recipient ?? true,
        send_to_manager: config.send_to_manager ?? false,
        send_to_approver: config.send_to_approver ?? false,
        additional_recipients: (config.additional_recipients || []).join(', '),
        delay_minutes: config.delay_minutes ?? 0,
        retry_count: config.retry_count ?? 3,
        description: config.description || '',
      });
    } else {
      setSelectedConfig(null);
      setFormData({
        event_type: eventType || '',
        is_enabled: true,
        send_to_recipient: true,
        send_to_manager: false,
        send_to_approver: false,
        additional_recipients: '',
        delay_minutes: 0,
        retry_count: 3,
        description: '',
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setSelectedConfig(null);
  };

  const handleSubmit = () => {
    if (!formData.event_type) {
      toast.error('Event type is required');
      return;
    }

    const data = {
      ...formData,
      additional_recipients: formData.additional_recipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e),
    };

    if (selectedConfig) {
      updateMutation.mutate({ id: selectedConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>;
  }

  const configuredEvents = new Set(configs.map(c => c.event_type));
  const unconfiguredEvents = EVENT_TYPES.filter(e => !configuredEvents.has(e));

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800 ml-2">
          Configure when and to whom notifications are sent for each event type.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => openDialog()} disabled={unconfiguredEvents.length === 0}>
          Add Notification Config
        </Button>
      </div>

      <div className="grid gap-4">
        {configs.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            <p>No custom notification configurations. System will send notifications by default.</p>
          </Card>
        ) : (
          configs.map(config => (
            <Card key={config.id} className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={config.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {config.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <h3 className="font-semibold text-gray-900">{config.event_type}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Recipients</p>
                        <div className="flex gap-1">
                          {config.send_to_recipient && <Badge variant="outline" className="text-xs">Employee</Badge>}
                          {config.send_to_manager && <Badge variant="outline" className="text-xs">Manager</Badge>}
                          {config.send_to_approver && <Badge variant="outline" className="text-xs">Approver</Badge>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Settings</p>
                        <p className="text-xs text-gray-600">
                          {config.delay_minutes > 0 && `Delay: ${config.delay_minutes}min • `}
                          Retries: {config.retry_count}
                        </p>
                      </div>
                    </div>
                    
                    {config.description && (
                      <p className="text-xs text-gray-600 mt-2">{config.description}</p>
                    )}
                  </div>
                  
                  <Button variant="ghost" size="sm" onClick={() => openDialog(config)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedConfig ? 'Edit Notification Config' : 'Add Notification Config'}</DialogTitle>
            <DialogDescription>Configure notification behavior for an event</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {!selectedConfig && (
              <div>
                <Label>Event Type *</Label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData(p => ({ ...p, event_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select event type</option>
                  {unconfiguredEvents.map(evt => (
                    <option key={evt} value={evt}>{evt}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedConfig && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedConfig.event_type}</p>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Enable This Notification</Label>
                <Switch checked={formData.is_enabled} onCheckedChange={(val) => setFormData(p => ({ ...p, is_enabled: val }))} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Send to Employee</Label>
                  <p className="text-xs text-gray-500">Recipient of the request</p>
                </div>
                <Switch checked={formData.send_to_recipient} onCheckedChange={(val) => setFormData(p => ({ ...p, send_to_recipient: val }))} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Send to Manager</Label>
                  <p className="text-xs text-gray-500">Employee's manager (if available)</p>
                </div>
                <Switch checked={formData.send_to_manager} onCheckedChange={(val) => setFormData(p => ({ ...p, send_to_manager: val }))} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Send to Approver</Label>
                  <p className="text-xs text-gray-500">Person who took the action</p>
                </div>
                <Switch checked={formData.send_to_approver} onCheckedChange={(val) => setFormData(p => ({ ...p, send_to_approver: val }))} />
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <Label className="text-sm">Additional Recipients (CC)</Label>
                <Input placeholder="email1@example.com, email2@example.com" value={formData.additional_recipients}
                  onChange={(e) => setFormData(p => ({ ...p, additional_recipients: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Delay (minutes)</Label>
                  <Input type="number" min="0" value={formData.delay_minutes}
                    onChange={(e) => setFormData(p => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-sm">Retry Count</Label>
                  <Input type="number" min="1" value={formData.retry_count}
                    onChange={(e) => setFormData(p => ({ ...p, retry_count: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>

              <div>
                <Label className="text-sm">Description</Label>
                <Input placeholder="Admin notes about this notification" value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedConfig ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}