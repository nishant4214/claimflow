import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, FileText, Calendar, Clock, MapPin, Users, 
  Building, Eye, Download, Mail, Phone, User
} from "lucide-react";
import { motion } from "framer-motion";
import DocumentViewer from '../components/documents/DocumentViewer';

const getStatusBadge = (status) => {
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
    approved: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    completed: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completed' },
  };
  const { color, label } = config[status] || config.pending;
  return <Badge className={`${color} border`}>{label}</Badge>;
};

export default function RoomBookingDetails() {
  const [user, setUser] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => base44.entities.RoomBooking.filter({ id: bookingId }),
    select: (data) => data[0],
    enabled: !!bookingId,
  });

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const handleViewDocument = (url, index) => {
    setSelectedDocument({ url, name: `Document ${index + 1}` });
    setViewerOpen(true);
  };

  const handleDownloadDocument = (url, index) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `document_${index + 1}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('ConferenceRooms')}>
            <Button variant="ghost" className="mb-4 -ml-2 text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Conference Rooms
            </Button>
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">
                  {booking.booking_number}
                </h1>
                {getStatusBadge(booking.status)}
              </div>
              <p className="text-gray-500 mt-2">{booking.meeting_title}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Conference Room</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{booking.room_name}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Meeting Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {booking.booking_date && format(parseISO(booking.booking_date), 'MMMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Time</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {booking.start_time} - {booking.end_time} ({booking.duration_minutes} min)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Number of Attendees</p>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{booking.attendees_count}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Category</p>
                        <Badge variant="outline">{booking.meeting_category}</Badge>
                      </div>
                    </div>
                  </div>

                  {booking.purpose && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Purpose/Agenda</p>
                        <p className="text-gray-700">{booking.purpose}</p>
                      </div>
                    </>
                  )}

                  {booking.additional_notes && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Additional Notes</p>
                        <p className="text-gray-700">{booking.additional_notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Attendees List */}
            {booking.attendees_list?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Attendees List
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {booking.attendees_list.map((attendee, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{attendee.name}</p>
                              <div className="space-y-1 mt-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-3 h-3" />
                                  <span>{attendee.email}</span>
                                </div>
                                {attendee.contact && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    <span>{attendee.contact}</span>
                                  </div>
                                )}
                                {attendee.company_name && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Building className="w-3 h-3" />
                                    <span>{attendee.company_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Documents Card */}
            {booking.document_urls?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Supporting Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {booking.document_urls.map((url, index) => {
                        const fileExtension = url.split('.').pop()?.toLowerCase();
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
                        const isPDF = fileExtension === 'pdf';
                        
                        return (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg hover:border-blue-300 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-blue-600">
                                      {index + 1}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">
                                    Document {index + 1}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    {isPDF && <Badge variant="outline" className="text-[10px] px-1.5 py-0">PDF</Badge>}
                                    {isImage && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Image</Badge>}
                                    {!isPDF && !isImage && <Badge variant="outline" className="text-[10px] px-1.5 py-0">File</Badge>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleViewDocument(url, index)}
                                  className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                                  size="sm"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                                <Button 
                                  onClick={() => handleDownloadDocument(url, index)}
                                  variant="outline"
                                  className="gap-2 hover:bg-gray-100 hover:border-gray-300"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                              </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Rejection Reason */}
            {booking.rejection_reason && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 shadow-sm bg-red-50">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-red-100">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-red-700">Rejection Reason</p>
                        <p className="text-gray-700 mt-1">{booking.rejection_reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Requester Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500 font-medium">
                    Requested By
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      {booking.employee_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{booking.employee_name}</p>
                      <p className="text-sm text-gray-500">{booking.employee_email}</p>
                    </div>
                  </div>
                  {booking.department && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span>{booking.department}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Services */}
            {(booking.pre_setup_required || booking.post_cleanup_required || booking.catering_required || booking.it_support_required || booking.video_recording_required) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm text-gray-500 font-medium">
                      Additional Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {booking.pre_setup_required && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Pre-setup</span>
                        <Badge variant="outline">{booking.pre_setup_minutes} min</Badge>
                      </div>
                    )}
                    {booking.post_cleanup_required && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Post-cleanup</span>
                        <Badge variant="outline">{booking.post_cleanup_minutes} min</Badge>
                      </div>
                    )}
                    {booking.catering_required && (
                      <div className="text-sm">✓ Catering</div>
                    )}
                    {booking.it_support_required && (
                      <div className="text-sm">✓ IT Support</div>
                    )}
                    {booking.video_recording_required && (
                      <div className="text-sm">✓ Video Recording</div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Document Viewer Modal */}
        <DocumentViewer
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          documentUrl={selectedDocument?.url}
          documentName={selectedDocument?.name}
        />
      </div>
    </div>
  );
}