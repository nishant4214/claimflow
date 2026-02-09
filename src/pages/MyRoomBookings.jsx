import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Users, MapPin, Plus, Eye, XCircle, CheckCircle, AlertCircle, MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { logCriticalAction } from '../components/session/SessionLogger';
import { ROOM_NOTIFICATION_TYPES } from '../components/notifications/RoomBookingNotifications';

const getStatusBadge = (status) => {
  const config = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
    rejected: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
    cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    completed: { icon: CheckCircle, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completed' },
    sent_back: { icon: AlertCircle, color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Sent Back' },
  };
  const { icon: Icon, color, label } = config[status] || config.pending;
  return (
    <Badge className={`${color} border`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

export default function MyRoomBookings() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: myBookings = [], isLoading } = useQuery({
    queryKey: ['my-room-bookings', user?.email],
    queryFn: () => base44.entities.RoomBooking.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: allFeedback = [] } = useQuery({
    queryKey: ['my-feedback', user?.email],
    queryFn: () => base44.entities.RoomFeedback.filter({ respondent_email: user?.email }),
    enabled: !!user?.email,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId) => base44.entities.RoomBooking.update(bookingId, { status: 'cancelled' }),
    onSuccess: async (cancelledBooking, bookingId) => {
      toast.success('Booking cancelled successfully');
      logCriticalAction('Room Booking', 'Cancel Booking', bookingId);
      
      // Create cancellation notification
      await base44.entities.Notification.create({
        recipient_email: cancelledBooking.employee_email,
        notification_type: ROOM_NOTIFICATION_TYPES.BOOKING_CANCELLED,
        title: 'Booking Cancelled',
        message: `Your booking for ${cancelledBooking.room_name} on ${format(parseISO(cancelledBooking.booking_date), 'PPP')} has been cancelled.`,
        booking_id: cancelledBooking.id,
        booking_number: cancelledBooking.booking_number,
        is_read: false,
        email_sent: false,
      });
      
      queryClient.invalidateQueries({ queryKey: ['my-room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['room-bookings-all'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    },
  });

  const filterBySearch = (booking) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.meeting_title?.toLowerCase().includes(query) ||
      booking.room_name?.toLowerCase().includes(query) ||
      booking.booking_number?.toLowerCase().includes(query) ||
      booking.booking_date?.includes(query) ||
      booking.status?.toLowerCase().includes(query)
    );
  };

  const upcomingBookings = myBookings.filter(b => {
    if (!b.booking_date) return false;
    const [hours, minutes] = b.end_time.split(':').map(Number);
    const meetingEndTime = new Date(b.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    return meetingEndTime > new Date() && ['pending', 'approved'].includes(b.status) && filterBySearch(b);
  });

  const pastBookings = myBookings.filter(b => {
    if (!b.booking_date) return false;
    const [hours, minutes] = b.end_time.split(':').map(Number);
    const meetingEndTime = new Date(b.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    return (meetingEndTime < new Date() || ['rejected', 'cancelled'].includes(b.status)) && filterBySearch(b);
  });

  const getFeedbackStatus = (booking) => {
    const hasFeedback = allFeedback.some(f => f.booking_id === booking.id);
    const [hours, minutes] = booking.end_time.split(':').map(Number);
    const meetingEndTime = new Date(booking.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    const hasMeetingEnded = new Date() > meetingEndTime;
    const feedbackDeadline = new Date(meetingEndTime.getTime() + 48 * 60 * 60 * 1000);
    const isFeedbackExpired = new Date() > feedbackDeadline;
    const canHaveFeedback = hasMeetingEnded && !['cancelled', 'rejected'].includes(booking.status);
    
    if (canHaveFeedback) {
      if (hasFeedback) return { status: 'submitted', label: 'Submitted', color: 'bg-green-100 text-green-700 border-green-300' };
      if (isFeedbackExpired) return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-600 border-gray-300' };
      const hoursLeft = Math.round((feedbackDeadline - new Date()) / (1000 * 60 * 60));
      return { status: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-300', hoursLeft };
    }
    if (!hasMeetingEnded && !['cancelled', 'rejected'].includes(booking.status)) {
      return { status: 'not_ready', label: 'Not Ready', color: 'bg-slate-100 text-slate-600 border-slate-300' };
    }
    return null;
  };

  const BookingRow = ({ booking }) => {
    const canEdit = booking.status === 'sent_back';
    const feedbackInfo = getFeedbackStatus(booking);
    
    return (
      <TableRow className="hover:bg-gray-50">
        <TableCell className="py-4">
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{booking.meeting_title}</div>
            <div className="text-xs font-mono text-gray-500">{booking.booking_number}</div>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{booking.room_name}</span>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {booking.booking_date ? format(parseISO(booking.booking_date), 'MMM dd, yyyy') : 'N/A'}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {booking.start_time} - {booking.end_time}
            </div>
          </div>
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Users className="w-4 h-4 text-gray-400" />
            {booking.attendees_count}
          </div>
        </TableCell>
        
        <TableCell>
          {getStatusBadge(booking.status)}
          {booking.rejection_reason && (
            <div className="mt-2 text-xs text-red-600 max-w-xs truncate" title={booking.rejection_reason}>
              Reason: {booking.rejection_reason}
            </div>
          )}
          {booking.send_back_reason && (
            <div className="mt-2 text-xs text-amber-600 max-w-xs truncate" title={booking.send_back_reason}>
              {booking.send_back_reason}
            </div>
          )}
        </TableCell>
        
        <TableCell>
          {feedbackInfo ? (
            <Badge className={`${feedbackInfo.color} border font-medium whitespace-nowrap`}>
              {feedbackInfo.status === 'submitted' && <CheckCircle className="w-3 h-3 mr-1" />}
              {feedbackInfo.status === 'pending' && <MessageSquare className="w-3 h-3 mr-1" />}
              {feedbackInfo.status === 'not_ready' && <Clock className="w-3 h-3 mr-1" />}
              {feedbackInfo.label}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">N/A</span>
          )}
        </TableCell>
        
        <TableCell>
          <div className="flex items-center gap-2 justify-end">
            {feedbackInfo?.status === 'pending' && (
              <Link to={createPageUrl(`SubmitFeedback?bookingId=${booking.id}`)}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Give Feedback
                </Button>
              </Link>
            )}
            
            <Link to={createPageUrl(`RoomBookingDetails?id=${booking.id}`)}>
              <Button variant="outline" size="sm">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Details
              </Button>
            </Link>
            
            {canEdit && (
              <Link to={createPageUrl(`BookRoom?edit=${booking.id}`)}>
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  Edit
                </Button>
              </Link>
            )}
            
            {booking.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => cancelBookingMutation.mutate(booking.id)}
                disabled={cancelBookingMutation.isPending}
              >
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Conference Room Bookings</h1>
            <p className="text-gray-500 mt-1">View and manage your conference room reservations</p>
          </div>
          <Link to={createPageUrl('BookRoom')}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </Link>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{myBookings.length}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{upcomingBookings.length}</p>
                <p className="text-sm text-gray-500">Upcoming</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {myBookings.filter(b => b.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{pastBookings.length}</p>
                <p className="text-sm text-gray-500">Past</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {allFeedback.filter(f => f.respondent_email === user?.email).length}
                </p>
                <p className="text-sm text-gray-500">Feedback Given</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by meeting title, room name, booking number, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <Clock className="w-4 h-4" />
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : upcomingBookings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
                  <p className="text-gray-500 mb-4">Book a conference room to get started</p>
                  <Link to={createPageUrl('BookRoom')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Book a Conference Room
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Meeting Details</TableHead>
                        <TableHead className="font-semibold">Room</TableHead>
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Attendees</TableHead>
                        <TableHead className="font-semibold">Booking Status</TableHead>
                        <TableHead className="font-semibold">Feedback Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingBookings.map(booking => (
                        <BookingRow key={booking.id} booking={booking} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No past bookings</h3>
                  <p className="text-gray-500">Your completed bookings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Meeting Details</TableHead>
                        <TableHead className="font-semibold">Room</TableHead>
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Attendees</TableHead>
                        <TableHead className="font-semibold">Booking Status</TableHead>
                        <TableHead className="font-semibold">Feedback Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastBookings.map(booking => (
                        <BookingRow key={booking.id} booking={booking} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}