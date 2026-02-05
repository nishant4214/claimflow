import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Clock, Building2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import StatsCard from './StatsCard';

export default function RoomAnalyticsWidget() {
  const [selectedDate, setSelectedDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: bookings = [] } = useQuery({
    queryKey: ['room-bookings-analytics-widget'],
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
  
  const totalRoomSlots = rooms.length * 8;
  const occupiedSlots = todayBookings.length;
  const availabilityPercent = totalRoomSlots > 0 ? ((totalRoomSlots - occupiedSlots) / totalRoomSlots * 100).toFixed(1) : 100;

  // Room-wise bookings for selected date
  const selectedDateBookings = bookings.filter(b => 
    b.booking_date === selectedDate && ['pending', 'approved'].includes(b.status)
  );

  const roomWiseData = rooms.map(room => {
    const roomBookings = selectedDateBookings.filter(b => b.room_id === room.room_id);
    return {
      name: room.room_name,
      bookings: roomBookings.length,
    };
  });

  // Date-wise bookings (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return format(date, 'yyyy-MM-dd');
  });

  const dateWiseData = last7Days.map(date => {
    const dayBookings = bookings.filter(b => b.booking_date === date && ['pending', 'approved'].includes(b.status));
    return {
      date: format(parseISO(date), 'MMM dd'),
      bookings: dayBookings.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Bookings Today"
          value={todayBookings.length}
          icon={Calendar}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Availability"
          value={`${availabilityPercent}%`}
          icon={TrendingUp}
          color="green"
          delay={0.1}
        />
        <StatsCard
          title="Total Bookings"
          value={bookings.length}
          icon={Clock}
          color="purple"
          delay={0.2}
        />
        <StatsCard
          title="Total Rooms"
          value={rooms.length}
          icon={Building2}
          color="indigo"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Room-wise Bookings</CardTitle>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm border rounded-md px-2 py-1"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roomWiseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Date-wise Bookings (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dateWiseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}