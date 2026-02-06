import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3x3, List, Search, Users, MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from 'sonner';
import RoomCard from '../components/rooms/RoomCard';
import BookingForm from '../components/rooms/BookingForm';
import CalendarViewToggle from '../components/rooms/CalendarViewToggle';
import { logCriticalAction } from '../components/session/SessionLogger';

export default function BookRoom() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['conference-rooms'],
    queryFn: () => base44.entities.ConferenceRoom.filter({ is_active: true }),
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['room-bookings-all'],
    queryFn: () => base44.entities.RoomBooking.list('-created_date'),
  });

  const createBookingMutation = useMutation({
    mutationFn: (bookingData) => base44.entities.RoomBooking.create(bookingData),
    onSuccess: async (newBooking) => {
      toast.success('Booking request submitted successfully');
      logCriticalAction('Room Booking', 'Submit Booking', newBooking.booking_number);
      
      // Send notifications
      const { notifyBookingSubmitted, notifyApprovalRequired } = await import('../components/notifications/RoomBookingNotifications');
      await notifyBookingSubmitted(newBooking, user);
      await notifyApprovalRequired(newBooking);
      
      queryClient.invalidateQueries({ queryKey: ['room-bookings-all'] });
      queryClient.invalidateQueries({ queryKey: ['my-room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      navigate(createPageUrl('MyRoomBookings'));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create booking');
    },
  });

  const getRoomAvailability = (room) => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = allBookings.filter(
      b => b.room_id === room.room_id && 
           b.booking_date === today && 
           ['pending', 'approved'].includes(b.status)
    );
    
    if (todayBookings.length === 0) return { status: 'available', label: 'Available All Day' };
    if (todayBookings.length >= 8) return { status: 'booked', label: 'Fully Booked' };
    return { status: 'partial', label: `${todayBookings.length} booking(s) today` };
  };

  const filteredRooms = rooms.filter(room => {
    const searchMatch = !search || 
      room.room_name?.toLowerCase().includes(search.toLowerCase()) ||
      room.room_id?.toLowerCase().includes(search.toLowerCase()) ||
      room.location?.toLowerCase().includes(search.toLowerCase());
    
    const categoryMatch = categoryFilter === 'all' || room.category === categoryFilter;
    
    const capacityMatch = capacityFilter === 'all' || 
      (capacityFilter === '1-5' && room.seating_capacity <= 5) ||
      (capacityFilter === '6-10' && room.seating_capacity >= 6 && room.seating_capacity <= 10) ||
      (capacityFilter === '11-15' && room.seating_capacity >= 11 && room.seating_capacity <= 15) ||
      (capacityFilter === '16+' && room.seating_capacity >= 16);
    
    return searchMatch && categoryMatch && capacityMatch;
  });

  const handleSubmitBooking = (bookingData) => {
    createBookingMutation.mutate(bookingData);
  };

  if (selectedRoom) {
    return (
      <BookingForm
        room={selectedRoom}
        user={user}
        onBack={() => setSelectedRoom(null)}
        onSubmit={handleSubmitBooking}
        isSubmitting={createBookingMutation.isPending}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Conference Room</h1>
          <p className="text-gray-500 mt-1">
            Browse available conference rooms and book your meeting space
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search rooms..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Meeting Room">Meeting Room</SelectItem>
                    <SelectItem value="Training Room">Training Room</SelectItem>
                    <SelectItem value="Board Room">Board Room</SelectItem>
                    <SelectItem value="Executive Suite">Executive Suite</SelectItem>
                    <SelectItem value="Huddle Room">Huddle Room</SelectItem>
                    <SelectItem value="Interview Room">Interview Room</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="1-5">1-5 people</SelectItem>
                    <SelectItem value="6-10">6-10 people</SelectItem>
                    <SelectItem value="11-15">11-15 people</SelectItem>
                    <SelectItem value="16+">16+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Room Grid/List/Calendar */}
        {viewMode === 'calendar' ? (
          <CalendarViewToggle
            onSelectRoom={(room) => setSelectedRoom(room)}
            selectedDate={calendarDate}
            onDateChange={setCalendarDate}
          />
        ) : isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conference rooms found</h3>
              <p className="text-gray-500">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                availability={getRoomAvailability(room)}
                onBook={() => setSelectedRoom(room)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}