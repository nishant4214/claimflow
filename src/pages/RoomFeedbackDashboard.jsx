import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, TrendingUp, Users, MessageSquare, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function RoomFeedbackDashboard() {
  const [user, setUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';
  const canViewDashboard = ['junior_admin', 'admin_head', 'admin'].includes(userRole);

  const { data: allFeedback = [], isLoading } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: () => base44.entities.RoomFeedback.filter({ 
      overall_rating: { $gte: 1 } // Exclude system markers
    }),
    enabled: canViewDashboard,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms-analytics'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view this dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter feedback by date range
  const startDate = subDays(new Date(), parseInt(dateRange));
  const filteredFeedback = allFeedback.filter(f => {
    const feedbackDate = new Date(f.created_date);
    const inDateRange = feedbackDate >= startDate;
    const inRoom = selectedRoom === 'all' || f.room_id === selectedRoom;
    return inDateRange && inRoom;
  });

  // Calculate statistics
  const totalResponses = filteredFeedback.length;
  const avgOverallRating = totalResponses > 0 
    ? (filteredFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / totalResponses).toFixed(2)
    : 0;

  const organizerFeedback = filteredFeedback.filter(f => f.respondent_type === 'organizer');
  const participantFeedback = filteredFeedback.filter(f => f.respondent_type === 'participant');

  const avgOrganizerRating = organizerFeedback.length > 0
    ? (organizerFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / organizerFeedback.length).toFixed(2)
    : 0;

  const avgParticipantRating = participantFeedback.length > 0
    ? (participantFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / participantFeedback.length).toFixed(2)
    : 0;

  // Room-wise average ratings
  const roomRatings = rooms.map(room => {
    const roomFeedback = filteredFeedback.filter(f => f.room_id === room.room_id);
    const avgRating = roomFeedback.length > 0
      ? (roomFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / roomFeedback.length)
      : 0;
    return {
      name: room.room_name,
      rating: parseFloat(avgRating.toFixed(2)),
      responses: roomFeedback.length
    };
  }).filter(r => r.responses > 0).sort((a, b) => b.rating - a.rating);

  // Category-wise ratings
  const categoryRatings = [
    {
      category: 'Overall',
      rating: parseFloat(avgOverallRating),
      organizer: parseFloat(avgOrganizerRating),
      participant: parseFloat(avgParticipantRating)
    },
    {
      category: 'Room Quality',
      rating: totalResponses > 0 
        ? parseFloat((filteredFeedback.reduce((sum, f) => sum + f.room_quality_rating, 0) / totalResponses).toFixed(2))
        : 0,
      organizer: organizerFeedback.length > 0
        ? parseFloat((organizerFeedback.reduce((sum, f) => sum + f.room_quality_rating, 0) / organizerFeedback.length).toFixed(2))
        : 0,
      participant: participantFeedback.length > 0
        ? parseFloat((participantFeedback.reduce((sum, f) => sum + f.room_quality_rating, 0) / participantFeedback.length).toFixed(2))
        : 0
    },
    {
      category: 'Equipment',
      rating: totalResponses > 0 
        ? parseFloat((filteredFeedback.reduce((sum, f) => sum + f.equipment_rating, 0) / totalResponses).toFixed(2))
        : 0,
      organizer: organizerFeedback.length > 0
        ? parseFloat((organizerFeedback.reduce((sum, f) => sum + f.equipment_rating, 0) / organizerFeedback.length).toFixed(2))
        : 0,
      participant: participantFeedback.length > 0
        ? parseFloat((participantFeedback.reduce((sum, f) => sum + f.equipment_rating, 0) / participantFeedback.length).toFixed(2))
        : 0
    },
    {
      category: 'Cleanliness',
      rating: totalResponses > 0 
        ? parseFloat((filteredFeedback.reduce((sum, f) => sum + f.cleanliness_rating, 0) / totalResponses).toFixed(2))
        : 0,
      organizer: organizerFeedback.length > 0
        ? parseFloat((organizerFeedback.reduce((sum, f) => sum + f.cleanliness_rating, 0) / organizerFeedback.length).toFixed(2))
        : 0,
      participant: participantFeedback.length > 0
        ? parseFloat((participantFeedback.reduce((sum, f) => sum + f.cleanliness_rating, 0) / participantFeedback.length).toFixed(2))
        : 0
    }
  ];

  // Trends over time (last 7 days)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'MMM dd');
    const dayFeedback = filteredFeedback.filter(f => {
      const fDate = new Date(f.created_date);
      return format(fDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
    const avgRating = dayFeedback.length > 0
      ? (dayFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / dayFeedback.length)
      : 0;
    return {
      date: dateStr,
      rating: parseFloat(avgRating.toFixed(2)),
      responses: dayFeedback.length
    };
  });

  // Distribution of ratings
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating}⭐`,
    count: filteredFeedback.filter(f => f.overall_rating === rating).length
  }));

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  // Recent comments
  const recentComments = filteredFeedback
    .filter(f => f.comments && f.comments.trim())
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  const StarDisplay = ({ rating }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conference Room Feedback Analytics</h1>
          <p className="text-gray-500 mt-1">Insights and trends from user feedback</p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms.map(room => (
                      <SelectItem key={room.room_id} value={room.room_id}>
                        {room.room_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Responses</p>
                  <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
                </div>
                <Users className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Rating</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{avgOverallRating}</p>
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <TrendingUp className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-500">Organizers</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{avgOrganizerRating}</p>
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">{organizerFeedback.length} responses</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-500">Participants</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{avgParticipantRating}</p>
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">{participantFeedback.length} responses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rooms">Room Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Category Comparison */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Rating Breakdown: Organizers vs Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryRatings}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="organizer" fill="#3b82f6" name="Organizers" />
                    <Bar dataKey="participant" fill="#8b5cf6" name="Participants" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ratingDistribution}
                        dataKey="count"
                        nameKey="rating"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Room Performance Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roomRatings.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No feedback data available</p>
                  ) : (
                    roomRatings.map((room, idx) => (
                      <div key={room.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-800">#{idx + 1}</Badge>
                          <span className="font-medium">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">{room.responses} responses</span>
                          <StarDisplay rating={room.rating} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>7-Day Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" domain={[0, 5]} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="rating" stroke="#3b82f6" name="Avg Rating" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="responses" stroke="#8b5cf6" name="Responses" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentComments.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No comments available</p>
                  ) : (
                    recentComments.map((feedback, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{feedback.room_name}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(feedback.created_date), 'PPP')} • {feedback.respondent_type}
                            </p>
                          </div>
                          <StarDisplay rating={feedback.overall_rating} />
                        </div>
                        <p className="text-sm text-gray-700 italic">"{feedback.comments}"</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}