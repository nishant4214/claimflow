import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, MapPin, Clock, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CalendarViewWidget({ userRole, user, defaultExpanded = false }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');
  const [expandedView, setExpandedView] = useState(defaultExpanded);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms-widget'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['room-bookings-widget', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => base44.entities.RoomBooking.filter({ 
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      status: { $in: ['pending', 'approved'] }
    }),
    enabled: !!selectedDate,
  });

  const canViewDetails = ['junior_admin', 'admin_head', 'admin'].includes(userRole);
  const availableRooms = rooms.filter(room => !bookings.some(b => b.room_id === room.room_id));
  const bookedRooms = bookings.length;

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

  const filteredTimeSlots = selectedTimeSlot === 'all' 
    ? timeSlots 
    : timeSlots.filter(slot => {
        const hour = parseInt(selectedTimeSlot.split(':')[0]);
        const slotHour = parseInt(slot.split(':')[0]);
        return slotHour >= hour && slotHour < hour + 3;
      });

  const handleBookRoom = (room, timeSlot = null) => {
    if (timeSlot) {
      // Calculate end time (30 minutes after start)
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const endMinutes = minutes + 30;
      const endHours = endMinutes >= 60 ? hours + 1 : hours;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      
      const params = new URLSearchParams({
        roomId: room.room_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: timeSlot,
        endTime: endTime
      });
      navigate(`${createPageUrl('BookRoom')}?${params.toString()}`);
    } else {
      navigate(createPageUrl('BookRoom'));
    }
  };

  const getBookingForSlot = (room, timeSlot) => {
    return bookings.find(booking => {
      if (booking.room_id !== room.room_id) return false;
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      return timeSlot >= bookingStart && timeSlot < bookingEnd;
    });
  };

  const BookingCell = ({ room, timeSlot }) => {
    const booking = getBookingForSlot(room, timeSlot);
    const isBooked = !!booking;

    return (
      <div 
        className={`h-12 border-l border-gray-200 flex items-center justify-center transition-colors relative group ${
          isBooked ? 'bg-red-50' : 'bg-green-50 hover:bg-green-100 cursor-pointer'
        }`}
        onClick={() => !isBooked && handleBookRoom(room, timeSlot)}
        title={isBooked ? 'Booked' : 'Click to book this room'}
      >
        <Badge className={`text-xs ${isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isBooked ? 'Booked' : 'Available'}
        </Badge>
        
        {isBooked && canViewDetails && booking && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
              <div className="font-semibold mb-1">{booking.meeting_title}</div>
              <div className="text-gray-300 mb-2">{booking.purpose}</div>
              <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{booking.start_time} - {booking.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>Booked by: {booking.employee_name}</span>
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Conference Room Calendar
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExpandedView(!expandedView)}
            >
              {expandedView ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Expand Full View
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mb-4"
              />
              
              {expandedView && (
                <div className="space-y-4">
                  <div>
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

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                      <span className="text-sm text-gray-600">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                      <span className="text-sm text-gray-600">Booked</span>
                    </div>
                  </div>
                </div>
              )}

              {!expandedView && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Available</span>
                    <Badge className="bg-green-100 text-green-800">{availableRooms.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Booked</span>
                    <Badge className="bg-red-100 text-red-800">{bookedRooms}</Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              {expandedView ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 z-20 p-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 w-48">
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
                              <div className="font-semibold text-gray-900 text-sm">{room.room_name}</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
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
              ) : (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </h3>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No bookings for this date</p>
                      <Button 
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                        onClick={() => navigate(createPageUrl('BookRoom'))}
                      >
                        Book a Room
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {canViewDetails ? (
                        bookings.map(booking => (
                          <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-900 mb-1">{booking.meeting_title}</div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {booking.room_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {booking.start_time} - {booking.end_time}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{booking.employee_name}</div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2">
                          {bookings.map((booking) => (
                            <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{booking.room_name}</span>
                                <Badge className="bg-red-100 text-red-800 text-xs">Booked</Badge>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {booking.start_time} - {booking.end_time}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}