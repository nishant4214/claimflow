import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle, MapPin, Calendar, Clock, Users } from "lucide-react";
import { format, parseISO } from 'date-fns';

export default function FeedbackForm({ booking, userEmail, userName, onSubmit, isSubmitting }) {
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    room_quality_rating: 0,
    equipment_rating: 0,
    cleanliness_rating: 0,
  });
  const [comments, setComments] = useState('');
  const [hoveredRating, setHoveredRating] = useState({});

  const ratingCategories = [
    { key: 'overall_rating', label: 'Overall Experience', description: 'How would you rate your overall meeting experience?' },
    { key: 'room_quality_rating', label: 'Room Quality', description: 'Conference room layout and ambiance' },
    { key: 'equipment_rating', label: 'Audio/Video Equipment', description: 'Quality of AV equipment and technology' },
    { key: 'cleanliness_rating', label: 'Cleanliness & Comfort', description: 'Room cleanliness and comfort level' },
  ];

  const handleRatingClick = (category, value) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const allRated = Object.values(ratings).every(r => r > 0);
    if (!allRated) {
      alert('Please provide ratings for all categories');
      return;
    }

    onSubmit({
      ...ratings,
      comments,
      respondent_email: userEmail,
      respondent_name: userName,
    });
  };

  const StarRating = ({ category, value }) => {
    const currentRating = ratings[category];
    const hovered = hoveredRating[category] || 0;

    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
              onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
              onClick={() => handleRatingClick(category, star)}
              className="transition-all hover:scale-110 focus:outline-none"
            >
              <Star
                className={`w-9 h-9 transition-colors ${
                  star <= (hovered || currentRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-gray-400'
                }`}
              />
            </button>
          ))}
        </div>
        <div className="min-w-[80px]">
          {currentRating > 0 ? (
            <span className="text-sm font-medium text-gray-700">
              {currentRating}/5 Stars
            </span>
          ) : (
            <span className="text-xs text-gray-400">Not rated</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Booking Details Card */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardHeader className="pb-4 border-b bg-gray-50">
          <CardTitle className="text-xl text-gray-900">Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Conference Room</div>
                <div className="font-medium text-gray-900">{booking.room_name}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Date</div>
                <div className="font-medium text-gray-900">
                  {booking.booking_date ? format(parseISO(booking.booking_date), 'MMMM dd, yyyy') : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Time</div>
                <div className="font-medium text-gray-900">{booking.start_time} - {booking.end_time}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Meeting Title</div>
                <div className="font-medium text-gray-900">{booking.meeting_title}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Form Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-xl text-gray-900">Rate Your Experience</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Please rate the following aspects of your meeting experience</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {ratingCategories.map((category, index) => (
              <div key={category.key} className={`pb-6 ${index !== ratingCategories.length - 1 ? 'border-b' : ''}`}>
                <div className="mb-3">
                  <Label className="text-sm font-semibold text-gray-900">{category.label}</Label>
                  <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                </div>
                <StarRating category={category.key} value={ratings[category.key]} />
              </div>
            ))}

            <div className="pt-2">
              <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                Additional Comments <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any additional thoughts, suggestions, or concerns about the conference room or meeting experience..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base font-medium"
              >
                {isSubmitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                {!isSubmitting && <CheckCircle className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}