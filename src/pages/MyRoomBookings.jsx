import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users, MapPin, Plus, Eye, XCircle, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
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

  const upcomingBookings = myBookings.filter(b => {
    if (!b.booking_date) return false;
    const [hours, minutes] = b.end_time.split(':').map(Number);
    const meetingEndTime = new Date(b.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    return meetingEndTime > new Date() && ['pending', 'approved'].includes(b.status);
  });

  const pastBookings = myBookings.filter(b => {
    if (!b.booking_date) return false;
    const [hours, minutes] = b.end_time.split(':').map(Number);
    const meetingEndTime = new Date(b.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    return meetingEndTime < new Date() || ['rejected', 'cancelled'].includes(b.status);
  });

  const BookingCard = ({ booking }) => {
    const canEdit = booking.status === 'sent_back';
    
    // Check if feedback submitted
    const hasFeedback = allFeedback.some(f => f.booking_id === booking.id);
    
    // Check if meeting has ended (based on actual date/time, not status)
    const [hours, minutes] = booking.end_time.split(':').map(Number);
    const meetingEndTime = new Date(booking.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    const hasMeetingEnded = new Date() > meetingEndTime;
    
    // Only allow feedback for approved bookings that have ended
    const isEligibleForFeedback = booking.status === 'approved' && hasMeetingEnded;
    
    // Check if feedback window expired (48 hours after meeting end)
    const feedbackDeadline = new Date(meetingEndTime.getTime() + 48 * 60 * 60 * 1000);
    const isFeedbackExpired = new Date() > feedbackDeadline;
    
    // Determine feedback status
    let feedbackStatus = null;
    if (isEligibleForFeedback) {
      if (hasFeedback) {
        feedbackStatus = 'submitted';
      } else if (isFeedbackExpired) {
        feedbackStatus = 'expired';
      } else {
        feedbackStatus = 'pending';
      }
    }
    
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          {/* Header with booking number and status */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-500">{booking.booking_number}</span>
              {getStatusBadge(booking.status)}
            </div>
            {feedbackStatus && (
              <Badge className={
                feedbackStatus === 'submitted' 
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : feedbackStatus === 'expired'
                  ? 'bg-gray-100 text-gray-600 border-gray-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }>
                {feedbackStatus === 'submitted' && <CheckCircle className="w-3 h-3 mr-1" />}
                {feedbackStatus === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                Feedback: {feedbackStatus.charAt(0).toUpperCase() + feedbackStatus.slice(1)}
              </Badge>
            )}
          </div>

          {/* Meeting title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{booking.meeting_title}</h3>

          {/* Key details in grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">{booking.room_name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-700">{booking.attendees_count} attendees</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-700">{booking.booking_date ? format(parseISO(booking.booking_date), 'MMM dd, yyyy') : 'N/A'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-700">{booking.start_time} - {booking.end_time}</span>
            </div>
          </div>

          {/* Alert messages */}
          {booking.rejection_reason && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
              <p className="text-xs font-semibold text-red-800 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{booking.rejection_reason}</p>
            </div>
          )}

          {booking.send_back_reason && (
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
              <p className="text-xs font-semibold text-amber-800 mb-1">Correction Required</p>
              <p className="text-sm text-amber-700">{booking.send_back_reason}</p>
            </div>
          )}

          {/* Feedback prompt for pending */}
          {feedbackStatus === 'pending' && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Your feedback is important!</p>
                <p className="text-xs text-blue-700 mt-1">
                  Share your experience within {Math.round((feedbackDeadline - new Date()) / (1000 * 60 * 60))} hours
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-3 border-t">
          <Link to={createPageUrl(`RoomBookingDetails?id=${booking.id}`)}>
            <Button variant="outline" size="sm" className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
          </Link>
          
          {feedbackStatus === 'pending' && (
            <Link to={createPageUrl(`SubmitFeedback?bookingId=${booking.id}`)} className="flex-1">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                <MessageSquare className="w-4 h-4 mr-1" />
                Give Feedback
              </Button>
            </Link>
          )}
          {canEdit && (
            <Link to={createPageUrl(`BookRoom?edit=${booking.id}`)}>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Eye className="w-4 h-4 mr-1" />
                Edit & Resubmit
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
              <XCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          </div>
          </div>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}