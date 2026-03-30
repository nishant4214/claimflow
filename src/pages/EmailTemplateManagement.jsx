import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, Eye, RefreshCw } from 'lucide-react';

const EVENT_TYPES = [
  'CLAIM_APPROVED',
  'CLAIM_REJECTED',
  'CLAIM_SENT_BACK',
  'ROOM_APPROVED',
  'ROOM_REJECTED',
  'ROOM_SENT_BACK',
  'TRANSPORT_APPROVED',
  'TRANSPORT_REJECTED',
  'TRANSPORT_SENT_BACK',
];

const PLACEHOLDER_INFO = {
  CLAIM_APPROVED: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'date'],
  CLAIM_REJECTED: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'remarks', 'date'],
  CLAIM_SENT_BACK: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'remarks', 'date'],
  ROOM_APPROVED: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'date'],
  ROOM_REJECTED: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'remarks', 'date'],
  ROOM_SENT_BACK: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'remarks', 'date'],
  TRANSPORT_APPROVED: ['employeeName', 'requestId', 'status', 'date'],
  TRANSPORT_REJECTED: ['employeeName', 'requestId', 'status', 'remarks', 'date'],
  TRANSPORT_SENT_BACK: ['employeeName', 'requestId', 'status', 'remarks', 'date']
};

const MOCK_DATA = {
  CLAIM_APPROVED: { employeeName: 'John Doe', requestId: 'CLM-2026-0001', amount: '15000', head: 'Travel', subHead: 'Flight', status: 'Approved', date: '30 Mar 2026' },
  CLAIM_REJECTED: { employeeName: 'Jane Smith', requestId: 'CLM-2026-0002', amount: '8000', head: 'Food', subHead: 'Client Meeting', status: 'Rejected', remarks: 'Amount exceeds policy limit', date: '30 Mar 2026' },
  CLAIM_SENT_BACK: { employeeName: 'Mike Wilson', requestId: 'CLM-2026-0003', amount: '5000', head: 'Accommodation', subHead: 'Hotel', status: 'Sent Back', remarks: 'Bill date mismatch with expense date', date: '30 Mar 2026' },
  ROOM_APPROVED: { employeeName: 'Alice Johnson', requestId: 'RB-2026-0001', roomName: 'Conference Room A', bookingDate: '01 Apr 2026', timeSlot: '10:00 - 11:30', status: 'Approved', date: '30 Mar 2026' },
  ROOM_REJECTED: { employeeName: 'Bob Brown', requestId: 'RB-2026-0002', roomName: 'Board Room', bookingDate: '02 Apr 2026', timeSlot: '14:00 - 15:00', status: 'Rejected', remarks: 'Room not available for the selected time', date: '30 Mar 2026' },
  ROOM_SENT_BACK: { employeeName: 'Carol Davis', requestId: 'RB-2026-0003', roomName: 'Training Room', bookingDate: '03 Apr 2026', timeSlot: '09:00 - 12:00', status: 'Sent Back', remarks: 'Please provide attendee list', date: '30 Mar 2026' },
  TRANSPORT_APPROVED: { employeeName: 'David Miller', requestId: 'TAR-2026-0001', status: 'Approved', date: '30 Mar 2026' },
  TRANSPORT_REJECTED: { employeeName: 'Emma Wilson', requestId: 'TAR-2026-0002', status: 'Rejected', remarks: 'Budget limit exceeded for this quarter', date: '30 Mar 2026' },
  TRANSPORT_SENT_BACK: { employeeName: 'Frank Thomas', requestId: 'TAR-2026-0003', status: 'Sent Back', remarks: 'Business justification needs more details', date: '30 Mar 2026' }
};

export default function EmailTemplateManagement() {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TYPES[0]);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState({ subject: '', body: '' });

  const { data: templates = [], refetch } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => base44.asServiceRole.entities.EmailTemplate.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const existing = templates.find(t => t.event_type === selectedEvent);
      if (existing) {
        return base44.asServiceRole.entities.EmailTemplate.update(existing.id, data);
      } else {
        return base44.asServiceRole.entities.EmailTemplate.create({ ...data, event_type: selectedEvent });
      }
    },
    onSuccess: () => {
      refetch();
      alert('Template saved successfully');
    },
    onError: (error) => {
      alert('Error saving template: ' + error.message);
    }
  });

  useEffect(() => {
    const template = templates.find(t => t.event_type === selectedEvent);
    if (template) {
      setFormData({ subject: template.subject, body: template.body });
    } else {
      setFormData({ subject: '', body: '' });
    }
  }, [selectedEvent, templates]);

  const handleSave = () => {
    if (!formData.subject.trim() || !formData.body.trim()) {
      alert('Subject and body cannot be empty');
      return;
    }
    updateMutation.mutate(formData);
  };

  const renderPreview = (text) => {
    if (!text) return '';
    const data = MOCK_DATA[selectedEvent] || {};
    return text.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => data[placeholder] || match);
  };

  const placeholders = PLACEHOLDER_INFO[selectedEvent] || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Email Template Management</h1>
        <p className="text-gray-600 mt-2">Create and customize email notification templates for different events</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Event Type Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Event Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EVENT_TYPES.map(eventType => (
              <button
                key={eventType}
                onClick={() => setSelectedEvent(eventType)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedEvent === eventType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {eventType.replace(/_/g, ' ')}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Template Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Placeholders Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Placeholders</CardTitle>
              <CardDescription>Use these in your subject and body</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {placeholders.map(placeholder => (
                  <Badge key={placeholder} variant="outline" className="cursor-pointer" onClick={() => {
                    setFormData(prev => ({ ...prev, body: prev.body + `{{${placeholder}}}` }));
                  }}>
                    {`{{${placeholder}}}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subject Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject with {{placeholders}}"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formData.subject && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Preview:</p>
                  <p className="text-sm font-medium">{renderPreview(formData.subject)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Body Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Body</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter email body with {{placeholders}}"
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              {formData.body && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-xs text-gray-600 mb-2">Preview:</p>
                  <pre className="text-xs whitespace-pre-wrap text-gray-700">{renderPreview(formData.body)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium mb-1">Using Default Templates</p>
            <p>If no custom template is set, the system will use built-in default templates. Changes to templates apply immediately.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}