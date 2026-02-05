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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Conference Rooms</h1>
          <p className="text-gray-500 mt-1">Manage your conference room bookings</p>
        </div>

        <Tabs defaultValue="book" className="w-full">
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="book" className="gap-2">
              <Calendar className="w-4 h-4" />
              Book Conference Room
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="gap-2">
              <FileText className="w-4 h-4" />
              My Bookings
            </TabsTrigger>
            {canApprove && (
              <TabsTrigger value="approvals" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Approvals
              </TabsTrigger>
            )}
            {canViewAnalytics && (
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="book">
            <BookRoom />
          </TabsContent>

          <TabsContent value="my-bookings">
            <MyRoomBookings />
          </TabsContent>

          {canApprove && (
            <TabsContent value="approvals">
              <RoomBookingApprovals />
            </TabsContent>
          )}

          {canViewAnalytics && (
            <TabsContent value="analytics">
              <RoomAnalytics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}