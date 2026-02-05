import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, Wrench } from "lucide-react";
import { toast } from 'sonner';
import { format, parseISO, addMinutes } from 'date-fns';
import { logCriticalAction } from '../components/session/SessionLogger';

export default function HousekeepingDashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['housekeeping-tasks'],
    queryFn: () => base44.entities.RoomBooking.filter({ status: 'approved' }, '-booking_date'),
  });

  const tasksNeedingSetup = bookings.filter(b => b.pre_setup_required && b.booking_date >= format(new Date(), 'yyyy-MM-dd'));
  const tasksNeedingCleanup = bookings.filter(b => b.post_cleanup_required && b.booking_date >= format(new Date(), 'yyyy-MM-dd'));

  const TaskCard = ({ booking, type }) => {
    const isSetup = type === 'setup';
    const minutes = isSetup ? booking.pre_setup_minutes : booking.post_cleanup_minutes;
    const startTime = isSetup 
      ? addMinutes(parseISO(`${booking.booking_date}T${booking.start_time}`), -minutes)
      : parseISO(`${booking.booking_date}T${booking.end_time}`);

    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={isSetup ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                  {isSetup ? 'Pre-Setup' : 'Post-Cleanup'}
                </Badge>
                <span className="text-xs text-gray-500">{minutes} min</span>
              </div>
              <h3 className="font-semibold text-gray-900">{booking.meeting_title}</h3>
              <p className="text-sm text-gray-500">Booking: {booking.booking_number}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{booking.room_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{format(parseISO(booking.booking_date), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>
                {isSetup ? `Before ${booking.start_time}` : `After ${booking.end_time}`}
              </span>
            </div>
          </div>

          {booking.special_instructions && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-medium text-yellow-800 mb-1">Special Instructions:</p>
              <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            {booking.catering_required && (
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Catering required</span>
              </div>
            )}
            {booking.it_support_required && (
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>IT support required</span>
              </div>
            )}
            {booking.video_recording_required && (
              <div className="flex items-center gap-2 text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Video recording setup</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Housekeeping Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage room setup and cleanup tasks</p>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{tasksNeedingSetup.length}</p>
                <p className="text-sm text-gray-500">Setup Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{tasksNeedingCleanup.length}</p>
                <p className="text-sm text-gray-500">Cleanup Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {tasksNeedingSetup.length + tasksNeedingCleanup.length}
                </p>
                <p className="text-sm text-gray-500">Total Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {bookings.filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd')).length}
                </p>
                <p className="text-sm text-gray-500">Today's Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="setup">
          <TabsList className="mb-6">
            <TabsTrigger value="setup" className="gap-2">
              <Wrench className="w-4 h-4" />
              Pre-Setup Tasks ({tasksNeedingSetup.length})
            </TabsTrigger>
            <TabsTrigger value="cleanup">
              Post-Cleanup Tasks ({tasksNeedingCleanup.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : tasksNeedingSetup.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No setup tasks</h3>
                  <p className="text-gray-500">All rooms are ready</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksNeedingSetup.map(booking => (
                  <TaskCard key={booking.id} booking={booking} type="setup" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cleanup">
            {tasksNeedingCleanup.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No cleanup tasks</h3>
                  <p className="text-gray-500">All rooms are clean</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasksNeedingCleanup.map(booking => (
                  <TaskCard key={booking.id} booking={booking} type="cleanup" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}