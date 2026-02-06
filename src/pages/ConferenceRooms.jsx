import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, CheckCircle, BarChart3 } from "lucide-react";
import BookRoom from './BookRoom';
import MyRoomBookings from './MyRoomBookings';
import RoomBookingApprovals from './RoomBookingApprovals';
import RoomAnalytics from './RoomAnalytics';

export default function ConferenceRooms() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const userRole = user?.portal_role || user?.role || 'employee';
  const canApprove = ['junior_admin', 'admin_head', 'admin'].includes(userRole);
  const canViewAnalytics = ['junior_admin', 'admin_head', 'admin'].includes(userRole);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Conference Rooms
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Manage your conference room bookings efficiently</p>
        </div>

        <Tabs defaultValue="book" className="w-full">
          <TabsList className="mb-8 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-1.5 inline-flex gap-1">
            <TabsTrigger 
              value="book" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Calendar className="w-4 h-4" />
              Book Room
            </TabsTrigger>
            <TabsTrigger 
              value="my-bookings" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <FileText className="w-4 h-4" />
              My Bookings
            </TabsTrigger>
            {canApprove && (
              <TabsTrigger 
                value="approvals" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                Approvals
              </TabsTrigger>
            )}
            {canViewAnalytics && (
              <TabsTrigger 
                value="analytics" 
                className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="book" className="mt-0">
            <BookRoom />
          </TabsContent>

          <TabsContent value="my-bookings" className="mt-0">
            <MyRoomBookings />
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals" className="mt-0">
              <RoomBookingApprovals />
            </TabsContent>
          )}

          {canViewAnalytics && (
            <TabsContent value="analytics" className="mt-0">
              <RoomAnalytics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}