import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle } from "lucide-react";

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
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [category]: star }))}
            onMouseLeave={() => setHoveredRating(prev => ({ ...prev, [category]: 0 }))}
            onClick={() => handleRatingClick(category, star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= (hovered || currentRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-600">
          {currentRating > 0 && `${currentRating}/5`}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-2xl">Conference Room Feedback</CardTitle>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p><strong>Meeting:</strong> {booking.meeting_title}</p>
            <p><strong>Room:</strong> {booking.room_name}</p>
            <p><strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {booking.start_time} - {booking.end_time}</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {ratingCategories.map(category => (
              <div key={category.key} className="space-y-3">
                <div>
                  <Label className="text-base font-semibold">{category.label}</Label>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <StarRating category={category.key} value={ratings[category.key]} />
              </div>
            ))}

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold">Additional Comments (Optional)</Label>
              <p className="text-sm text-gray-500 mb-3">Share any suggestions or concerns</p>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Tell us more about your experience..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="submit" disabled={isSubmitting} size="lg" className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}