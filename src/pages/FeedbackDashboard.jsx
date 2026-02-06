import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, TrendingUp, AlertTriangle, ThumbsUp, Download, Filter } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ExportButton from '../components/export/ExportButton';
import { format, subDays } from 'date-fns';

export default function FeedbackDashboard() {
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

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['conference-feedback'],
    queryFn: () => base44.entities.ConferenceFeedback.list('-created_date'),
    enabled: !!user && canViewDashboard,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms-feedback'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  if (!canViewDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">You don't have permission to view this page.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Filter feedbacks
  const cutoffDate = subDays(new Date(), parseInt(dateRange));
  const filteredFeedbacks = feedbacks.filter(f => {
    const matchesRoom = selectedRoom === 'all' || f.room_id === selectedRoom;
    const matchesDate = new Date(f.created_date) >= cutoffDate;
    return matchesRoom && matchesDate;
  });

  // Calculate stats
  const totalFeedbacks = filteredFeedbacks.length;
  const avgOverallRating = totalFeedbacks > 0
    ? (filteredFeedbacks.reduce((sum, f) => sum + f.overall_rating, 0) / totalFeedbacks).toFixed(1)
    : 0;
  const avgCleanlinessRating = totalFeedbacks > 0
    ? (filteredFeedbacks.reduce((sum, f) => sum + f.cleanliness_rating, 0) / totalFeedbacks).toFixed(1)
    : 0;
  const issueCount = filteredFeedbacks.filter(f => f.issue_reported).length;
  const recommendationRate = totalFeedbacks > 0
    ? ((filteredFeedbacks.filter(f => f.would_recommend).length / totalFeedbacks) * 100).toFixed(0)
    : 0;
  const flaggedCount = filteredFeedbacks.filter(f => f.is_flagged).length;

  // Room-wise stats
  const roomStats = rooms.map(room => {
    const roomFeedbacks = filteredFeedbacks.filter(f => f.room_id === room.room_id);
    return {
      room_name: room.room_name,
      total: roomFeedbacks.length,
      avg_rating: roomFeedbacks.length > 0
        ? (roomFeedbacks.reduce((sum, f) => sum + f.overall_rating, 0) / roomFeedbacks.length).toFixed(1)
        : 0,
      issue_count: roomFeedbacks.filter(f => f.issue_reported).length,
      recommendation_rate: roomFeedbacks.length > 0
        ? ((roomFeedbacks.filter(f => f.would_recommend).length / roomFeedbacks.length) * 100).toFixed(0)
        : 0,
    };
  }).filter(stat => stat.total > 0);

  // Daily trend data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayFeedbacks = filteredFeedbacks.filter(f => 
      format(new Date(f.created_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      date: format(date, 'MMM dd'),
      count: dayFeedbacks.length,
      avg_rating: dayFeedbacks.length > 0
        ? (dayFeedbacks.reduce((sum, f) => sum + f.overall_rating, 0) / dayFeedbacks.length).toFixed(1)
        : 0,
    };
  });

  // Common issues
  const issuesList = filteredFeedbacks
    .filter(f => f.issue_reported && f.issue_description)
    .map(f => ({ issue: f.issue_description, room: f.room_name, date: f.created_date }));

  // Flagged feedbacks
  const flaggedFeedbacks = filteredFeedbacks.filter(f => f.is_flagged);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback Dashboard</h1>
            <p className="text-gray-500 mt-1">Conference room feedback analytics</p>
          </div>
          <ExportButton data={filteredFeedbacks} filename="conference_room_feedback" />
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
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
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{totalFeedbacks}</p>
                </div>
                <Star className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Rating</p>
                  <p className="text-2xl font-bold text-gray-900">{avgOverallRating} / 5</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Issues Reported</p>
                  <p className="text-2xl font-bold text-gray-900">{issueCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Recommendation</p>
                  <p className="text-2xl font-bold text-gray-900">{recommendationRate}%</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Flagged</p>
                  <p className="text-2xl font-bold text-red-600">{flaggedCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rooms">Room Analysis</TabsTrigger>
            <TabsTrigger value="issues">Issues & Flagged</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Feedback Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" name="Feedback Count" />
                      <Line yAxisId="right" type="monotone" dataKey="avg_rating" stroke="#10b981" name="Avg Rating" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rating Distribution */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Average Ratings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Overall Experience</span>
                        <span className="text-sm font-semibold">{avgOverallRating} / 5</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600"
                          style={{ width: `${(avgOverallRating / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Cleanliness</span>
                        <span className="text-sm font-semibold">{avgCleanlinessRating} / 5</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600"
                          style={{ width: `${(avgCleanlinessRating / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Recommendation Rate</p>
                          <p className="text-2xl font-bold text-indigo-600">{recommendationRate}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Room On Time</p>
                          <p className="text-2xl font-bold text-green-600">
                            {totalFeedbacks > 0 
                              ? ((filteredFeedbacks.filter(f => f.room_on_time).length / totalFeedbacks) * 100).toFixed(0)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rooms">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Room-Wise Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roomStats.map((stat, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{stat.room_name}</h4>
                        <Badge>{stat.total} feedbacks</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Avg Rating</p>
                          <p className="text-lg font-semibold text-blue-600">{stat.avg_rating} / 5</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Issues</p>
                          <p className="text-lg font-semibold text-red-600">{stat.issue_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Recommend</p>
                          <p className="text-lg font-semibold text-green-600">{stat.recommendation_rate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <div className="space-y-6">
              {/* Flagged Feedbacks */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Flagged Feedbacks ({flaggedCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {flaggedFeedbacks.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No flagged feedbacks</p>
                  ) : (
                    <div className="space-y-4">
                      {flaggedFeedbacks.map((feedback, idx) => (
                        <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-semibold text-gray-900">{feedback.room_name}</h5>
                              <p className="text-sm text-gray-600">
                                {feedback.attendee_name} • {format(new Date(feedback.created_date), 'PPP')}
                              </p>
                            </div>
                            <Badge className="bg-red-100 text-red-800">
                              {feedback.overall_rating} ⭐
                            </Badge>
                          </div>
                          {feedback.issue_description && (
                            <p className="text-sm text-gray-700 mt-2">{feedback.issue_description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Common Issues */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Reported Issues ({issuesList.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {issuesList.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No issues reported</p>
                  ) : (
                    <div className="space-y-3">
                      {issuesList.map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">{item.room}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.date), 'MMM dd')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{item.issue}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}