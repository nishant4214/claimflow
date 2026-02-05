import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Monitor, Coffee, Video, Wifi } from "lucide-react";

const amenityIcons = {
  'TV': Monitor,
  'Smart TV': Monitor,
  'Whiteboard': Monitor,
  'Video Conference': Video,
  'Coffee Machine': Coffee,
  'WiFi': Wifi,
};

export default function RoomCard({ room, availability, onBook, viewMode = 'grid' }) {
  const { status, label } = availability;
  
  const statusConfig = {
    available: { color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
    partial: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
    booked: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
  };

  const { color, dot } = statusConfig[status] || statusConfig.available;

  if (viewMode === 'list') {
    return (
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xl font-semibold text-gray-900">{room.room_name}</h3>
                <Badge variant="outline">{room.category}</Badge>
                <Badge className={`${color} border`}>
                  <span className={`w-2 h-2 rounded-full ${dot} mr-2`} />
                  {label}
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Capacity: {room.seating_capacity} people</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Floor {room.floor}, {room.location}</span>
                </div>
              </div>

              {room.amenities && room.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {room.amenities.slice(0, 4).map((amenity, idx) => {
                    const Icon = amenityIcons[amenity] || Monitor;
                    return (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Icon className="w-3 h-3 mr-1" />
                        {amenity}
                      </Badge>
                    );
                  })}
                  {room.amenities.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{room.amenities.length - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={onBook}
              disabled={status === 'booked'}
              className="bg-blue-600 hover:bg-blue-700 ml-4"
            >
              {status === 'booked' ? 'Fully Booked' : 'Book Conference Room'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-t-xl flex items-center justify-center relative overflow-hidden">
          <div className="text-6xl opacity-20">📍</div>
          <Badge className={`absolute top-3 right-3 ${color} border`}>
            <span className={`w-2 h-2 rounded-full ${dot} mr-2`} />
            {label}
          </Badge>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{room.room_name}</h3>
            <Badge variant="outline" className="text-xs">{room.category}</Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Capacity: {room.seating_capacity}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Floor {room.floor}, {room.location}</span>
            </div>
          </div>

          {room.amenities && room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {room.amenities.slice(0, 3).map((amenity, idx) => {
                const Icon = amenityIcons[amenity] || Monitor;
                return (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <Icon className="w-3 h-3 mr-1" />
                    {amenity}
                  </Badge>
                );
              })}
              {room.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">+{room.amenities.length - 3}</Badge>
              )}
            </div>
          )}

          <Button
            onClick={onBook}
            disabled={status === 'booked'}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {status === 'booked' ? 'Fully Booked' : 'Book Conference Room'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}