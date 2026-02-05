import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Users, MapPin, Calendar, Clock, AlertTriangle, CheckCircle, Upload, X, Plus } from "lucide-react";
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function BookingForm({ room, user, onBack, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    booking_date: '',
    start_time: '',
    end_time: '',
    meeting_title: '',
    purpose: '',
    attendees_count: '',
    meeting_category: 'Meeting',
    pre_setup_required: false,
    pre_setup_minutes: 0,
    post_cleanup_required: false,
    post_cleanup_minutes: 0,
    special_instructions: '',
    catering_required: false,
    it_support_required: false,
    video_recording_required: false,
    additional_notes: '',
    attendees_list: [],
    document_urls: [],
  });

  const [attendee, setAttendee] = useState({ name: '', email: '', contact: '', company_name: '' });
  const [uploading, setUploading] = useState(false);

  const { data: allBookings = [] } = useQuery({
    queryKey: ['room-bookings-check'],
    queryFn: () => base44.entities.RoomBooking.list(),
  });

  const checkAvailability = () => {
    if (!formData.booking_date || !formData.start_time || !formData.end_time) {
      return { available: true, conflicts: [] };
    }

    const conflicts = allBookings.filter(booking => 
      booking.room_id === room.room_id &&
      booking.booking_date === formData.booking_date &&
      ['pending', 'approved'].includes(booking.status) &&
      (
        (formData.start_time >= booking.start_time && formData.start_time < booking.end_time) ||
        (formData.end_time > booking.start_time && formData.end_time <= booking.end_time) ||
        (formData.start_time <= booking.start_time && formData.end_time >= booking.end_time)
      )
    );

    return { available: conflicts.length === 0, conflicts };
  };

  const getOccupiedSlots = () => {
    if (!formData.booking_date) return [];
    
    return allBookings
      .filter(b => 
        b.room_id === room.room_id && 
        b.booking_date === formData.booking_date && 
        ['pending', 'approved'].includes(b.status)
      )
      .map(b => ({ start: b.start_time, end: b.end_time, title: b.meeting_title }));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttendee = () => {
    if (!attendee.name || !attendee.email) {
      toast.error('Please enter attendee name and email');
      return;
    }
    setFormData(prev => ({
      ...prev,
      attendees_list: [...prev.attendees_list, { ...attendee }]
    }));
    setAttendee({ name: '', email: '', contact: '', company_name: '' });
  };

  const handleRemoveAttendee = (index) => {
    setFormData(prev => ({
      ...prev,
      attendees_list: prev.attendees_list.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setFormData(prev => ({
        ...prev,
        document_urls: [...prev.document_urls, ...uploadedUrls]
      }));
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      document_urls: prev.document_urls.filter((_, i) => i !== index)
    }));
  };

  const calculateDuration = () => {
    if (!formData.start_time || !formData.end_time) return 0;
    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.booking_date) {
      toast.error('Please select a date');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('Please select start and end time');
      return;
    }
    if (formData.start_time >= formData.end_time) {
      toast.error('End time must be after start time');
      return;
    }

    const { available, conflicts } = checkAvailability();
    if (!available) {
      toast.error(`Conference room is not available for the selected time slot. Conflicts with ${conflicts.length} existing booking(s).`);
      return;
    }

    if (!formData.meeting_title) {
      toast.error('Please enter a meeting title');
      return;
    }
    if (!formData.attendees_count || formData.attendees_count < 1) {
      toast.error('Please enter number of attendees');
      return;
    }
    if (parseInt(formData.attendees_count) > room.seating_capacity) {
      toast.error(`Room capacity is ${room.seating_capacity} people`);
      return;
    }

    const duration = calculateDuration();
    const bookingNumber = `RB-${format(new Date(), 'yyyy-MM-dd')}-${Date.now().toString().slice(-6)}`;

    onSubmit({
      booking_number: bookingNumber,
      room_id: room.room_id,
      room_name: room.room_name,
      employee_name: user?.full_name || '',
      employee_email: user?.email || '',
      department: user?.department || '',
      ...formData,
      duration_minutes: duration,
      attendees_count: parseInt(formData.attendees_count),
      status: 'pending',
    });
  };

  const { available, conflicts } = checkAvailability();
  const occupiedSlots = getOccupiedSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={onBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Conference Rooms
        </Button>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-3xl">
                📍
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{room.room_name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Floor {room.floor}, {room.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Capacity: {room.seating_capacity} people
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date & Time */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => handleChange('booking_date', e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    max={format(addDays(new Date(), 90), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => handleChange('start_time', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => handleChange('end_time', e.target.value)}
                    required
                  />
                </div>
              </div>

              {calculateDuration() > 0 && (
                <p className="text-sm text-gray-600">
                  Duration: {calculateDuration()} minutes ({Math.floor(calculateDuration() / 60)}h {calculateDuration() % 60}m)
                </p>
              )}

              {/* Availability Status */}
              {formData.booking_date && formData.start_time && formData.end_time && (
                <Alert className={available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <div className="flex items-start gap-3">
                    {available ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertDescription className={available ? 'text-green-800' : 'text-red-800'}>
                        {available ? (
                          <span className="font-medium">Conference room is available for the selected time slot</span>
                        ) : (
                          <div>
                            <p className="font-medium mb-2">Conference room is not available for the selected time slot</p>
                            <p className="text-sm">Conflicts with {conflicts.length} existing booking(s):</p>
                            <ul className="text-sm mt-1 space-y-1">
                              {conflicts.map((c, idx) => (
                                <li key={idx}>• {c.start_time} - {c.end_time}: {c.meeting_title}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Show occupied slots for selected date */}
              {formData.booking_date && occupiedSlots.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Occupied time slots for {format(new Date(formData.booking_date), 'PPP')}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {occupiedSlots.map((slot, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white text-blue-800">
                        {slot.start} - {slot.end}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Meeting Info */}
              <div>
                <Label>Meeting Title *</Label>
                <Input
                  value={formData.meeting_title}
                  onChange={(e) => handleChange('meeting_title', e.target.value)}
                  placeholder="e.g., Quarterly Review Meeting"
                  required
                />
              </div>

              <div>
                <Label>Purpose/Agenda</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => handleChange('purpose', e.target.value)}
                  placeholder="Brief description of the meeting purpose..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Number of Attendees * (Max: {room.seating_capacity})</Label>
                  <Input
                    type="number"
                    value={formData.attendees_count}
                    onChange={(e) => handleChange('attendees_count', e.target.value)}
                    min="1"
                    max={room.seating_capacity}
                    required
                  />
                </div>
                <div>
                  <Label>Meeting Category</Label>
                  <Select value={formData.meeting_category} onValueChange={(v) => handleChange('meeting_category', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Interview">Interview</SelectItem>
                      <SelectItem value="Board Meeting">Board Meeting</SelectItem>
                      <SelectItem value="Client Meeting">Client Meeting</SelectItem>
                      <SelectItem value="Internal Discussion">Internal Discussion</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Housekeeping */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Housekeeping Requirements</h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.pre_setup_required}
                    onCheckedChange={(checked) => handleChange('pre_setup_required', checked)}
                  />
                  <Label className="cursor-pointer">Pre-meeting setup required</Label>
                </div>

                {formData.pre_setup_required && (
                  <div className="ml-6">
                    <Label>Setup time before meeting</Label>
                    <Select 
                      value={formData.pre_setup_minutes.toString()} 
                      onValueChange={(v) => handleChange('pre_setup_minutes', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.post_cleanup_required}
                    onCheckedChange={(checked) => handleChange('post_cleanup_required', checked)}
                  />
                  <Label className="cursor-pointer">Post-meeting cleanup required</Label>
                </div>

                {formData.post_cleanup_required && (
                  <div className="ml-6">
                    <Label>Cleanup time after meeting</Label>
                    <Select 
                      value={formData.post_cleanup_minutes.toString()} 
                      onValueChange={(v) => handleChange('post_cleanup_minutes', parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Special Setup Instructions</Label>
                  <Textarea
                    value={formData.special_instructions}
                    onChange={(e) => handleChange('special_instructions', e.target.value)}
                    placeholder="e.g., Arrange chairs in U-shape, Set up projector"
                    rows={2}
                  />
                </div>
              </div>

              {/* Additional Services */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Additional Services</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.catering_required}
                    onCheckedChange={(checked) => handleChange('catering_required', checked)}
                  />
                  <Label className="cursor-pointer">Catering/Refreshments</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.it_support_required}
                    onCheckedChange={(checked) => handleChange('it_support_required', checked)}
                  />
                  <Label className="cursor-pointer">IT Support</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.video_recording_required}
                    onCheckedChange={(checked) => handleChange('video_recording_required', checked)}
                  />
                  <Label className="cursor-pointer">Video Recording</Label>
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.additional_notes}
                  onChange={(e) => handleChange('additional_notes', e.target.value)}
                  placeholder="Any other requirements or notes..."
                  rows={2}
                />
              </div>

              {/* Attendees List */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Attendees List (Optional)</h3>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Attendee Name"
                    value={attendee.name}
                    onChange={(e) => setAttendee(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={attendee.email}
                    onChange={(e) => setAttendee(prev => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    placeholder="Contact Number"
                    value={attendee.contact}
                    onChange={(e) => setAttendee(prev => ({ ...prev, contact: e.target.value }))}
                  />
                  <Input
                    placeholder="Company/Vendor Name"
                    value={attendee.company_name}
                    onChange={(e) => setAttendee(prev => ({ ...prev, company_name: e.target.value }))}
                  />
                </div>

                <Button type="button" variant="outline" onClick={handleAddAttendee} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Attendee
                </Button>

                {formData.attendees_list.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {formData.attendees_list.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{att.name}</p>
                          <p className="text-xs text-gray-500">{att.email}</p>
                          {(att.contact || att.company_name) && (
                            <p className="text-xs text-gray-500">
                              {att.contact} {att.company_name && `• ${att.company_name}`}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAttendee(idx)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Supporting Documents */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Supporting Documents (Optional)</h3>
                
                <div>
                  <Label htmlFor="documents" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload documents
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, Images, Excel, CSV supported
                      </p>
                    </div>
                    <Input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </Label>
                </div>

                {uploading && (
                  <div className="text-center text-sm text-gray-500">
                    Uploading files...
                  </div>
                )}

                {formData.document_urls.length > 0 && (
                  <div className="space-y-2">
                    {formData.document_urls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span className="text-sm">Document {idx + 1}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(idx)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? 'Submitting...' : 'Submit Booking Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}