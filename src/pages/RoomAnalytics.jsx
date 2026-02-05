import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calendar, TrendingUp, Users, Clock, Building2, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import ExportButton from '../components/export/ExportButton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RoomAnalytics() {
  const [user, setUser] = useState(null);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ['room-bookings-analytics'],
    queryFn: () => base44.entities.RoomBooking.list('-created_date'),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms'],
    queryFn: () => base44.entities.ConferenceRoom.list(),
  });

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const todayBookings = bookings.filter(b => b.booking_date === todayStr && ['pending', 'approved'].includes(b.status));
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  
  const totalRoomSlots = rooms.length * 8; // 8 time slots per day
  const occupiedSlots = todayBookings.length;
  const availabilityPercent = totalRoomSlots > 0 ? ((totalRoomSlots - occupiedSlots) / totalRoomSlots * 100).toFixed(1) : 100;

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weeklyBookings = bookings.filter(b => {
    if (!b.booking_date) return false;
    const bookingDate = parseISO(b.booking_date);
    return isWithinInterval(bookingDate, { start: weekStart, end: weekEnd }) && ['pending', 'approved'].includes(b.status);
  });

  const totalWeeklyMinutes = weeklyBookings.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
  const avgUtilization = totalWeeklyMinutes / (rooms.length * 7 * 480) * 100; // 480 min = 8 hours per day

  // Room utilization data
  const roomUtilization = rooms.map(room => {
    const roomBookings = approvedBookings.filter(b => b.room_id === room.room_id);
    const totalMinutes = roomBookings.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);
    const hours = (totalMinutes / 60).toFixed(1);
    
    return {
      name: room.room_name,
      hours: parseFloat(hours),
      bookings: roomBookings.length,
    };
  }).sort((a, b) => b.hours - a.hours);

  // Category distribution
  const categoryData = bookings.reduce((acc, b) => {
    if (b.status === 'approved') {
      const cat = b.meeting_category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
    }
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Daily bookings trend
  const dailyTrend = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.booking_date === dayStr && ['pending', 'approved'].includes(b.status));
    return {
      day: format(day, 'EEE'),
      bookings: dayBookings.length,
    };
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conference Room Analytics</h1>
            <p className="text-gray-500 mt-1">Usage insights and utilization metrics</p>
          </div>
          <ExportButton data={bookings} filename="room-analytics" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Bookings Today"
            value={todayBookings.length}
            icon={Calendar}
            color="text-blue-600"
          />
          <StatCard
            title="Availability"
            value={`${availabilityPercent}%`}
            icon={TrendingUp}
            color="text-green-600"
            subtitle={`${occupiedSlots}/${totalRoomSlots} slots used`}
          />
          <StatCard
            title="Weekly Utilization"
            value={`${avgUtilization.toFixed(1)}%`}
            icon={Clock}
            color="text-purple-600"
            subtitle={`${weeklyBookings.length} bookings`}
          />
          <StatCard
            title="Total Rooms"
            value={rooms.length}
            icon={Building2}
            color="text-indigo-600"
            subtitle={`${rooms.filter(r => r.is_active).length} active`}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Booking Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Meeting Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Room Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={roomUtilization} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Hours', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="hours" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}