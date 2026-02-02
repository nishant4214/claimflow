import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { 
  Bell, Check, CheckCheck, FileText, 
  AlertCircle, CheckCircle, XCircle, IndianRupee, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const notificationIcons = {
  claim_submitted: FileText,
  claim_approved: CheckCircle,
  claim_rejected: XCircle,
  claim_sent_back: AlertCircle,
  payment_processed: IndianRupee,
  sla_warning: AlertCircle,
  pending_approval: Bell,
};

const notificationColors = {
  claim_submitted: 'bg-blue-100 text-blue-600',
  claim_approved: 'bg-green-100 text-green-600',
  claim_rejected: 'bg-red-100 text-red-600',
  claim_sent_back: 'bg-amber-100 text-amber-600',
  payment_processed: 'bg-emerald-100 text-emerald-600',
  sla_warning: 'bg-orange-100 text-orange-600',
  pending_approval: 'bg-purple-100 text-purple-600',
};

export default function Notifications() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" className="mb-2 -ml-2 text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.notification_type] || Bell;
                const colorClass = notificationColors[notification.notification_type] || 'bg-gray-100 text-gray-600';

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                  >
                    <Card className={`border-0 shadow-sm transition-all duration-200 ${
                      !notification.is_read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className={`p-2.5 rounded-xl ${colorClass} h-fit`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-400">
                                    {notification.created_date && format(parseISO(notification.created_date), 'MMM d, yyyy h:mm a')}
                                  </span>
                                  {notification.claim_number && (
                                    <Link 
                                      to={createPageUrl(`ClaimDetails?id=${notification.claim_id}`)}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      View Claim →
                                    </Link>
                                  )}
                                </div>
                              </div>
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsReadMutation.mutate(notification.id)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}