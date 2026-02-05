import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSessionLogger } from '@/components/session/SessionLogger';
import SessionLogger from '@/components/session/SessionLogger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, FileText, Plus, CheckSquare, 
  Wallet, Settings, Tag, GitBranch, BarChart3, 
  Bell, User, Users, LogOut, Menu, ChevronRight, X, Upload, Calendar
} from "lucide-react";

const roleMenuConfig = {
  employee: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Submit Claim', icon: Plus, page: 'SubmitClaim' },
    { name: 'My Claims', icon: FileText, page: 'MyClaims' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  junior_admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'My Claims', icon: FileText, page: 'MyClaims' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  manager: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'My Claims', icon: FileText, page: 'MyClaims' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  admin_head: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'My Claims', icon: FileText, page: 'MyClaims' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Bulk Upload', icon: Upload, page: 'BulkUpload' },
    { name: 'Categories', icon: Tag, page: 'AdminCategories' },
    { name: 'Workflow Config', icon: GitBranch, page: 'WorkflowConfig' },
    { name: 'Reports', icon: BarChart3, page: 'Reports' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  cro: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'My Claims', icon: FileText, page: 'MyClaims' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Bulk Upload', icon: Upload, page: 'BulkUpload' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  cfo: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Reports', icon: BarChart3, page: 'Reports' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  finance: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Finance', icon: Wallet, page: 'Finance' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Reports', icon: BarChart3, page: 'Reports' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
  admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Test Credentials', icon: Users, page: 'TestCredentials' },
    { name: 'Approvals', icon: CheckSquare, page: 'Approvals' },
    { name: 'Finance', icon: Wallet, page: 'Finance' },
    { name: 'Book Room', icon: Calendar, page: 'BookRoom' },
    { name: 'My Room Bookings', icon: FileText, page: 'MyRoomBookings' },
    { name: 'Bulk Upload', icon: Upload, page: 'BulkUpload' },
    { name: 'Categories', icon: Tag, page: 'AdminCategories' },
    { name: 'Workflow Config', icon: GitBranch, page: 'WorkflowConfig' },
    { name: 'Reports', icon: BarChart3, page: 'Reports' },
    { name: 'User Management', icon: User, page: 'UserManagement' },
    { name: 'Notifications', icon: Bell, page: 'Notifications' },
  ],
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notification-count', user?.email],
    queryFn: () => base44.entities.Notification.filter({ 
      recipient_email: user?.email, 
      is_read: false 
    }),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const userRole = user?.portal_role || user?.role || 'employee';
  const menuItems = roleMenuConfig[userRole] || roleMenuConfig.employee;
  const unreadCount = notifications.length;

  // Initialize session logging
  useSessionLogger(user, currentPageName);

  const handleLogout = async () => {
    await SessionLogger.endSession('Logged_Out');
    base44.auth.logout(createPageUrl('Login'));
  };

  const NavLink = ({ item, onClick }) => {
    const isActive = currentPageName === item.page;
    const Icon = item.icon;
    const isNotification = item.name === 'Notifications';

    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
        {isNotification && unreadCount > 0 && (
          <Badge className="ml-auto bg-red-500 text-white text-xs px-2">
            {unreadCount}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* User Profile Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{userRole.replace('_', ' ')}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink key={item.page} item={item} />
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Notifications')}>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">Menu</span>
                      <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user?.full_name || 'User'}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                  <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                      <NavLink 
                        key={item.page} 
                        item={item} 
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </nav>
                  <div className="p-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}