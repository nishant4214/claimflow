import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ArrowRight, MapPin, Clock } from "lucide-react";
import { format } from 'date-fns';

export default function CalendarViewWidget({ userRole }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Room Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border mb-4"
          />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Available Rooms</span>
              <Badge className="bg-green-100 text-green-800">{availableRooms.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Booked Rooms</span>
              <Badge className="bg-red-100 text-red-800">{bookedRooms}</Badge>
            </div>
          </div>

          <Link to={createPageUrl('CalendarView')}>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              View Full Calendar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            {format(selectedDate, 'EEEE, MMM d')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No bookings for this date</p>
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
                  {bookings.map((booking, index) => (
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
        </CardContent>
      </Card>
    </div>
  );
}