import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, AlertTriangle, Search } from "lucide-react";
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { logCriticalAction } from '../components/session/SessionLogger';

export default function RoomBookingApprovals() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, booking: null, action: null });
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';
  const canApprove = ['junior_admin', 'admin_head', 'admin'].includes(userRole);

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ['room-bookings-approvals'],
    queryFn: () => base44.entities.RoomBooking.list('-created_date'),
    enabled: !!user && canApprove,
  });

  const { data: allRooms = [] } = useQuery({
    queryKey: ['conference-rooms'],
    queryFn: () => base44.entities.ConferenceRoom.list(),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RoomBooking.update(id, data),
    onSuccess: (_, { id, data }) => {
      const action = data.status === 'approved' ? 'Approve' : data.status === 'rejected' ? 'Reject' : 'Update';
      toast.success(`Booking ${action.toLowerCase()}d successfully`);
      logCriticalAction('Room Booking Approval', action, id);
      queryClient.invalidateQueries({ queryKey: ['room-bookings-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['room-bookings-all'] });
      queryClient.invalidateQueries({ queryKey: ['my-room-bookings'] });
      setActionModal({ open: false, booking: null, action: null });
      setReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Action failed');
    },
  });

  const checkConflicts = (booking) => {
    return allBookings.filter(b => 
      b.id !== booking.id &&
      b.room_id === booking.room_id &&
      b.booking_date === booking.booking_date &&
      ['pending', 'approved'].includes(b.status) &&
      (
        (booking.start_time >= b.start_time && booking.start_time < b.end_time) ||
        (booking.end_time > b.start_time && booking.end_time <= b.end_time) ||
        (booking.start_time <= b.start_time && booking.end_time >= b.end_time)
      )
    );
  };

  const handleAction = (booking, action) => {
    setActionModal({ open: true, booking, action });
    setReason('');
  };

  const confirmAction = () => {
    const { booking, action } = actionModal;
    
    if (action === 'reject' && !reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const conflicts = action === 'approve' ? checkConflicts(booking) : [];
    if (conflicts.length > 0) {
      toast.error(`Conflict detected with ${conflicts.length} existing booking(s)`);
      return;
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user?.email,
      approved_at: new Date().toISOString(),
    };

    if (action === 'reject') {
      updateData.rejection_reason = reason;
    }

    updateBookingMutation.mutate({ id: booking.id, data: updateData });
  };

  const pendingBookings = allBookings.filter(b => b.status === 'pending');
  const processedBookings = allBookings.filter(b => ['approved', 'rejected'].includes(b.status));

  const filteredPending = pendingBookings.filter(b =>
    !search || 
    b.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.meeting_title?.toLowerCase().includes(search.toLowerCase()) ||
    b.room_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProcessed = processedBookings.filter(b =>
    !search || 
    b.booking_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.meeting_title?.toLowerCase().includes(search.toLowerCase()) ||
    b.room_name?.toLowerCase().includes(search.toLowerCase())
  );

  const BookingCard = ({ booking, isPending }) => {
    const conflicts = isPending ? checkConflicts(booking) : [];
    
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{booking.booking_number}</h3>
                {conflicts.length > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Conflict
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 font-medium">{booking.meeting_title}</p>
              <p className="text-sm text-gray-500 mt-1">by {booking.employee_name}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{booking.room_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{booking.booking_date ? format(parseISO(booking.booking_date), 'PPP') : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{booking.start_time} - {booking.end_time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{booking.attendees_count} attendees</span>
            </div>
          </div>

          {booking.purpose && (
            <p className="text-sm text-gray-600 mb-3 p-3 bg-gray-50 rounded-lg">{booking.purpose}</p>
          )}

          {(booking.pre_setup_required || booking.post_cleanup_required) && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-1">Housekeeping Required:</p>
              <div className="text-xs text-blue-700 space-y-1">
                {booking.pre_setup_required && <div>• Setup: {booking.pre_setup_minutes} min before</div>}
                {booking.post_cleanup_required && <div>• Cleanup: {booking.post_cleanup_minutes} min after</div>}
              </div>
            </div>
          )}

          {booking.rejection_reason && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason:</p>
              <p className="text-sm text-red-700">{booking.rejection_reason}</p>
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 pt-3 border-t">
              <Button
                onClick={() => handleAction(booking, 'approve')}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={updateBookingMutation.isPending || conflicts.length > 0}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction(booking, 'reject')}
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                disabled={updateBookingMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="pt-3 border-t">
              <Badge className={booking.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {booking.status === 'approved' ? 'Approved' : 'Rejected'}
              </Badge>
              {booking.approved_by && (
                <p className="text-xs text-gray-500 mt-1">by {booking.approved_by}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-2xl mx-auto mt-20">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
              <p className="text-gray-500">You don't have permission to approve conference room bookings.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conference Room Booking Approvals</h1>
          <p className="text-gray-500 mt-1">Review and manage booking requests</p>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingBookings.length}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {processedBookings.filter(b => b.status === 'approved').length}
                </p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {processedBookings.filter(b => b.status === 'rejected').length}
                </p>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{allBookings.length}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              Pending ({filteredPending.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              Processed ({filteredProcessed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredPending.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
                  <p className="text-gray-500">All booking requests have been processed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPending.map(booking => (
                  <BookingCard key={booking.id} booking={booking} isPending={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed">
            {filteredProcessed.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No processed bookings</h3>
                  <p className="text-gray-500">Approved and rejected bookings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProcessed.map(booking => (
                  <BookingCard key={booking.id} booking={booking} isPending={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={actionModal.open} onOpenChange={(open) => setActionModal({ ...actionModal, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionModal.action === 'approve' ? 'Approve Booking' : 'Reject Booking'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {actionModal.action === 'approve' 
                  ? 'Are you sure you want to approve this booking?' 
                  : 'Please provide a reason for rejection:'}
              </p>
              
              {actionModal.action === 'reject' && (
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={4}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionModal({ open: false, booking: null, action: null })}>
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                className={actionModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                disabled={updateBookingMutation.isPending}
              >
                {updateBookingMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}