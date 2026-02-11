import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import FeedbackForm from '../components/feedback/FeedbackForm';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubmitFeedback() {
  const [user, setUser] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error('Auth error:', error);
        // For unauthenticated users (feedback links), allow anonymous access
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        
        if (type && email && name) {
          setUser({ email, full_name: name });
        }
      }
    };
    loadUser();

    // Get booking ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    setBookingId(urlParams.get('bookingId'));
  }, []);

  const { data: booking, isLoading: bookingLoading, error: bookingError } = useQuery({
    queryKey: ['booking-feedback', bookingId],
    queryFn: async () => {
      const data = await base44.entities.RoomBooking.filter({ id: bookingId });
      return data[0];
    },
    enabled: !!bookingId,
    retry: false,
  });

  const { data: existingFeedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['existing-feedback', bookingId, user?.email],
    queryFn: () => base44.entities.RoomFeedback.filter({ 
      booking_id: bookingId, 
      respondent_email: user?.email,
      overall_rating: { $gt: 0 }
    }),
    enabled: !!bookingId && !!user?.email,
    retry: false,
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (feedbackData) => base44.entities.RoomFeedback.create(feedbackData),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setTimeout(() => navigate(createPageUrl('MyRoomBookings')), 2000);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  const handleSubmit = (feedbackData) => {
    // Determine if user is organizer or participant
    const isOrganizer = user?.email === booking?.employee_email;
    const respondentType = isOrganizer ? 'organizer' : 'participant';

    submitFeedbackMutation.mutate({
      booking_id: booking.id,
      booking_number: booking.booking_number,
      room_id: booking.room_id,
      room_name: booking.room_name,
      meeting_title: booking.meeting_title,
      booking_date: booking.booking_date,
      respondent_type: respondentType,
      ...feedbackData,
    });
  };

  // Check if feedback window has expired (48 hours after meeting end)
  const isFeedbackWindowExpired = () => {
    if (!booking) return false;
    
    const [hours, minutes] = booking.end_time.split(':').map(Number);
    const meetingEndTime = new Date(booking.booking_date);
    meetingEndTime.setHours(hours, minutes, 0, 0);
    
    const feedbackDeadline = new Date(meetingEndTime.getTime() + 48 * 60 * 60 * 1000);
    return new Date() > feedbackDeadline;
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-800">
            Invalid feedback link. Please use the link provided in your email.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (bookingLoading || feedbackLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-800">
            Booking not found or you don't have access to this feedback.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if booking is completed
  if (booking.status !== 'completed' && booking.status !== 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Alert className="max-w-md border-amber-200 bg-amber-50">
          <Clock className="w-5 h-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Feedback can only be submitted after the meeting has been completed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if feedback already submitted
  if (existingFeedback && existingFeedback.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Feedback Already Submitted</h2>
              <p className="text-gray-600">
                We have already collected your response for this conference booking.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Thank you for your valuable feedback!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if feedback window expired
  if (isFeedbackWindowExpired()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-800">
            The feedback window for this booking has expired. Feedback must be submitted within 48 hours after the meeting ends.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 py-12">
      <FeedbackForm
        booking={booking}
        userEmail={user.email}
        userName={user.full_name}
        onSubmit={handleSubmit}
        isSubmitting={submitFeedbackMutation.isPending}
      />
    </div>
  );
}