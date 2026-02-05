import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, MapPin, Users } from "lucide-react";
import { format } from 'date-fns';

export default function CalendarViewToggle({ onSelectRoom, selectedDate, onDateChange }) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');

  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms-calendar'],
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

  const BookingCell = ({ room, timeSlot }) => {
    const isBooked = isRoomBooked(room, timeSlot);

    return (
      <div 
        className={`h-12 border-l border-gray-200 flex items-center justify-center transition-colors ${
          isBooked ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100 cursor-pointer'
        }`}
        onClick={() => !isBooked && onSelectRoom && onSelectRoom(room)}
      >
        <Badge className={`text-xs ${isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isBooked ? 'Booked' : 'Available'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Select Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
            
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-0 shadow-sm">
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}