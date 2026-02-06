import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Star, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from 'sonner';
import { format } from 'date-fns';

const StarRating = ({ value, onChange, label, required }) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default function RoomFeedback() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingId, setBookingId] = useState('');
  const [booking, setBooking] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    overall_rating: 0,
    cleanliness_rating: 0,
    av_quality: '',
    connectivity: '',
    facilities_used: [],
    issue_reported: false,
    issue_description: '',
    room_on_time: null,
    suggestions: '',
    would_recommend: null,
    is_anonymous: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    // Check for bookingId in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('bookingId');
    if (id) {
      setBookingId(id);
      loadBooking(id);
    }
  }, []);

  const loadBooking = async (id) => {
    try {
      const bookings = await base44.entities.RoomBooking.filter({ id });
      if (bookings.length > 0) {
        setBooking(bookings[0]);
        
        // Check if feedback already exists
        const feedback = await base44.entities.ConferenceFeedback.filter({ 
          booking_id: id,
          created_by: user?.email 
        });
        if (feedback.length > 0) {
          setExistingFeedback(feedback[0]);
          setFormData({
            overall_rating: feedback[0].overall_rating,
            cleanliness_rating: feedback[0].cleanliness_rating,
            av_quality: feedback[0].av_quality,
            connectivity: feedback[0].connectivity,
            facilities_used: feedback[0].facilities_used || [],
            issue_reported: feedback[0].issue_reported,
            issue_description: feedback[0].issue_description || '',
            room_on_time: feedback[0].room_on_time,
            suggestions: feedback[0].suggestions || '',
            would_recommend: feedback[0].would_recommend,
            is_anonymous: feedback[0].is_anonymous,
          });
        }
      }
    } catch (error) {
      toast.error('Failed to load booking details');
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data) => {
      if (existingFeedback) {
        return base44.entities.ConferenceFeedback.update(existingFeedback.id, data);
      }
      return base44.entities.ConferenceFeedback.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conference-feedback'] });
      toast.success('Thank you for your feedback!', {
        description: 'Your input helps us improve future conference experiences.',
      });
      // Redirect to bookings page after 2 seconds
      setTimeout(() => {
        window.location.href = '/ConferenceRooms';
      }, 2000);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFacility = (facility) => {
    setFormData(prev => ({
      ...prev,
      facilities_used: prev.facilities_used.includes(facility)
        ? prev.facilities_used.filter(f => f !== facility)
        : [...prev.facilities_used, facility]
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.overall_rating) {
          toast.error('Please provide an overall rating');
          return false;
        }
        if (!formData.cleanliness_rating) {
          toast.error('Please rate the room cleanliness');
          return false;
        }
        return true;
      case 2:
        if (!formData.av_quality) {
          toast.error('Please rate audio/video quality');
          return false;
        }
        if (!formData.connectivity) {
          toast.error('Please rate connectivity');
          return false;
        }
        return true;
      case 3:
        if (formData.issue_reported === null) {
          toast.error('Please indicate if you faced any issues');
          return false;
        }
        if (formData.issue_reported && !formData.issue_description.trim()) {
          toast.error('Please describe the issue');
          return false;
        }
        if (formData.room_on_time === null) {
          toast.error('Please confirm if the room was available on time');
          return false;
        }
        if (formData.would_recommend === null) {
          toast.error('Please indicate if you would recommend this room');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    const isFlagged = formData.overall_rating <= 2 || formData.issue_reported;

    submitMutation.mutate({
      booking_id: booking.id,
      booking_number: booking.booking_number,
      room_id: booking.room_id,
      room_name: booking.room_name,
      attendee_id: formData.is_anonymous ? null : user?.email,
      attendee_name: formData.is_anonymous ? 'Anonymous' : user?.full_name,
      meeting_date: booking.booking_date,
      meeting_time: `${booking.start_time} - ${booking.end_time}`,
      organizer_name: booking.employee_name,
      ...formData,
      is_flagged: isFlagged,
      submitted_at: new Date().toISOString(),
    });
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Loading feedback form...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conference Room Feedback</h1>
          <p className="text-gray-500 mt-1">Help us improve your meeting experience</p>
        </div>

        {/* Booking Info */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">{booking.room_name}</h3>
              <p className="text-sm text-gray-600">{booking.meeting_title}</p>
              <p className="text-sm text-gray-500">
                {format(new Date(booking.booking_date), 'PPP')} • {booking.start_time} - {booking.end_time}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Overall Experience & Cleanliness'}
                {currentStep === 2 && 'Audio/Video & Facilities'}
                {currentStep === 3 && 'Issues & Recommendations'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              {currentStep === 1 && (
                <>
                  <StarRating
                    label="Overall Experience"
                    value={formData.overall_rating}
                    onChange={(v) => handleChange('overall_rating', v)}
                    required
                  />
                  <StarRating
                    label="Room Cleanliness"
                    value={formData.cleanliness_rating}
                    onChange={(v) => handleChange('cleanliness_rating', v)}
                    required
                  />
                </>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Audio & Video Quality <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.av_quality} onValueChange={(v) => handleChange('av_quality', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select quality rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                        <SelectItem value="Not Used">Not Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Internet / Connectivity <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.connectivity} onValueChange={(v) => handleChange('connectivity', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connectivity status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stable">Stable</SelectItem>
                        <SelectItem value="Unstable">Unstable</SelectItem>
                        <SelectItem value="Not Available">Not Available</SelectItem>
                        <SelectItem value="Not Used">Not Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2">Facilities Used (Select all that apply)</Label>
                    <div className="space-y-2">
                      {['Projector / Screen', 'VC Setup', 'Whiteboard', 'Power Sockets', 'AC / Ventilation', 'Seating Comfort'].map((facility) => (
                        <div key={facility} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.facilities_used.includes(facility)}
                            onCheckedChange={() => toggleFacility(facility)}
                          />
                          <Label className="cursor-pointer">{facility}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <>
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Did you face any issues? <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={formData.issue_reported === true ? 'default' : 'outline'}
                        onClick={() => handleChange('issue_reported', true)}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={formData.issue_reported === false ? 'default' : 'outline'}
                        onClick={() => handleChange('issue_reported', false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>

                  {formData.issue_reported && (
                    <div>
                      <Label>Please describe the issue</Label>
                      <Textarea
                        value={formData.issue_description}
                        onChange={(e) => handleChange('issue_description', e.target.value)}
                        placeholder="Describe the issue you faced..."
                        rows={3}
                        maxLength={500}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.issue_description.length}/500 characters
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Was the room available on time? <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={formData.room_on_time === true ? 'default' : 'outline'}
                        onClick={() => handleChange('room_on_time', true)}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={formData.room_on_time === false ? 'default' : 'outline'}
                        onClick={() => handleChange('room_on_time', false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Suggestions / Improvements</Label>
                    <Textarea
                      value={formData.suggestions}
                      onChange={(e) => handleChange('suggestions', e.target.value)}
                      placeholder="Any suggestions to improve this conference room?"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.suggestions.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Would you recommend this room? <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={formData.would_recommend === true ? 'default' : 'outline'}
                        onClick={() => handleChange('would_recommend', true)}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={formData.would_recommend === false ? 'default' : 'outline'}
                        onClick={() => handleChange('would_recommend', false)}
                      >
                        No
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-4 border-t">
                    <Checkbox
                      checked={formData.is_anonymous}
                      onCheckedChange={(checked) => handleChange('is_anonymous', checked)}
                    />
                    <Label className="cursor-pointer text-sm">
                      Submit feedback anonymously (your identity will not be shown in reports)
                    </Label>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}