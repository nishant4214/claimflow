import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { format, parseISO } from 'date-fns';

export default function RoomAvailabilityWidget() {
  const { data: rooms = [] } = useQuery({
    queryKey: ['conference-rooms'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  const { data: todayBookings = [] } = useQuery({
    queryKey: ['today-bookings'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.RoomBooking.filter({ 
        booking_date: today,
        status: { $in: ['pending', 'approved'] }
      });
    },
  });

  const getRoomAvailability = (room) => {
    const roomBookings = todayBookings
      .filter(b => b.room_id === room.room_id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    if (roomBookings.length === 0) {
      return { status: 'available', slots: [], nextSlot: null };
    }

    return { 
      status: 'booked', 
      slots: roomBookings,
      nextSlot: roomBookings[0]
    };
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Today's Conference Room Availability
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rooms.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No conference rooms available</p>
          ) : (
            rooms.map(room => {
              const { status, slots, nextSlot } = getRoomAvailability(room);
              
              return (
                <div key={room.id} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{room.room_name}</h4>
                        <Badge 
                          variant="outline" 
                          className={status === 'available' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {status === 'available' ? 'Available' : `${slots.length} Booking${slots.length > 1 ? 's' : ''}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Floor {room.floor}, {room.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.seating_capacity} seats
                        </div>
                      </div>
                    </div>
                  </div>

                  {status === 'booked' && (
                    <div className="space-y-2 mt-3 pt-3 border-t">
                      {slots.map((booking, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span className="font-medium text-gray-700">
                              {booking.start_time} - {booking.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 truncate max-w-[200px]">
                              {booking.meeting_title}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={
                                booking.status === 'approved' 
                                  ? 'bg-green-50 text-green-700 text-xs' 
                                  : 'bg-yellow-50 text-yellow-700 text-xs'
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {status === 'available' && (
                    <p className="text-sm text-green-600 mt-2">Available all day</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}