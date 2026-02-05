import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, isSameDay } from 'date-fns';

export default function CalendarView() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['room-bookings-calendar', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => base44.entities.RoomBooking.filter({ 
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      status: { $in: ['pending', 'approved'] }
    }),
    enabled: !!selectedDate,
  });

  const userRole = user?.portal_role || user?.role || 'employee';
  const canViewBookingDetails = ['junior_admin', 'admin_head', 'admin'].includes(userRole);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const isRoomBooked = (room, timeSlot) => {
    return bookings.some(booking => {
      if (booking.room_id !== room.room_id) return false;
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      return timeSlot >= bookingStart && timeSlot < bookingEnd;
    });
  };

  const getBookingForSlot = (room, timeSlot) => {
    return bookings.find(booking => {
      if (booking.room_id !== room.room_id) return false;
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      return timeSlot >= bookingStart && timeSlot < bookingEnd;
    });
  };

  const filteredTimeSlots = selectedTimeSlot === 'all' 
    ? timeSlots 
    : timeSlots.filter(slot => slot >= selectedTimeSlot && slot < (parseInt(selectedTimeSlot.split(':')[0]) + 2) + ':00');

  const BookingCell = ({ room, timeSlot }) => {
    const booking = getBookingForSlot(room, timeSlot);
    const isBooked = !!booking;

    if (!isBooked) {
      return (
        <div className="h-12 border-l border-gray-200 bg-green-50 flex items-center justify-center">
          <Badge className="bg-green-100 text-green-700 text-xs">Available</Badge>
        </div>
      );
    }

    if (!canViewBookingDetails) {
      return (
        <div className="h-12 border-l border-gray-200 bg-red-50 flex items-center justify-center">
          <Badge className="bg-red-100 text-red-700 text-xs">Booked</Badge>
        </div>
      );
    }

    return (
      <div className="h-12 border-l border-gray-200 bg-red-50 p-2 hover:bg-red-100 transition-colors">
        <div className="text-xs font-medium text-red-900 truncate">{booking.meeting_title}</div>
        <div className="text-xs text-red-600 truncate">{booking.employee_name}</div>
      </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conference Room Calendar</h1>
          <p className="text-gray-500 mt-1">View room availability and bookings</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Day</SelectItem>
                    <SelectItem value="09:00">Morning (9 AM - 12 PM)</SelectItem>
                    <SelectItem value="12:00">Afternoon (12 PM - 3 PM)</SelectItem>
                    <SelectItem value="15:00">Evening (3 PM - 6 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                  <span className="text-sm text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                  <span className="text-sm text-gray-600">Booked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rooms.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No conference rooms available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 z-10 p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 min-w-[200px]">
                          Room
                        </th>
                        {filteredTimeSlots.map(slot => (
                          <th key={slot} className="p-2 text-xs font-medium text-gray-700 border-b-2 border-gray-200 min-w-[80px]">
                            {slot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(room => (
                        <tr key={room.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="sticky left-0 bg-white z-10 p-3 border-r-2 border-gray-200">
                            <div>
                              <div className="font-semibold text-gray-900">{room.room_name}</div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {room.floor} - {room.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {room.seating_capacity}
                                </span>
                              </div>
                            </div>
                          </td>
                          {filteredTimeSlots.map(slot => (
                            <td key={slot} className="p-0 border-gray-200">
                              <BookingCell room={room} timeSlot={slot} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canViewBookingDetails && bookings.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
                  <div className="space-y-3">
                    {bookings.map(booking => (
                      <div key={booking.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{booking.meeting_title}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {booking.room_name} • {booking.start_time} - {booking.end_time}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.employee_name} • {booking.attendees_count} attendees
                          </div>
                        </div>
                        <Badge className={
                          booking.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}