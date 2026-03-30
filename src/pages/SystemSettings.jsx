import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";
import RolePermissionManager from './admin/RolePermissionManager';
import NotificationManager from './admin/NotificationManager';

export default function SystemSettings() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('roles');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Failed to load user:', e);
      }
    };
    loadUser();
  }, []);

  const userRole = user?.portal_role || user?.role;
  const isAdmin = userRole === 'admin';

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Only administrators can access System Settings. Your role: <strong>{userRole}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">Manage system configuration and behavior</p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800 ml-2">
            Changes made here override hardcoded system defaults and apply immediately to new operations.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Card className="border-0 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger 
                value="roles" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
              >
                Roles & Permissions
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
              >
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="mt-0 p-6">
              <RolePermissionManager />
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 p-6">
              <NotificationManager />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}