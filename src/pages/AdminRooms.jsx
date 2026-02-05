import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { toast } from 'sonner';
import { logCriticalAction } from '../components/session/SessionLogger';

export default function AdminRooms() {
  const [user, setUser] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, room: null });
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['conference-rooms-admin'],
    queryFn: () => base44.entities.ConferenceRoom.list('-created_date'),
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.ConferenceRoom.create(data),
    onSuccess: () => {
      toast.success('Room created successfully');
      logCriticalAction('Room Config', 'Create Room', formData.room_name);
      queryClient.invalidateQueries({ queryKey: ['conference-rooms-admin'] });
      queryClient.invalidateQueries({ queryKey: ['conference-rooms'] });
      closeModal();
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConferenceRoom.update(id, data),
    onSuccess: () => {
      toast.success('Room updated successfully');
      logCriticalAction('Room Config', 'Update Room', formData.room_name);
      queryClient.invalidateQueries({ queryKey: ['conference-rooms-admin'] });
      queryClient.invalidateQueries({ queryKey: ['conference-rooms'] });
      closeModal();
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.ConferenceRoom.delete(id),
    onSuccess: () => {
      toast.success('Room deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['conference-rooms-admin'] });
      queryClient.invalidateQueries({ queryKey: ['conference-rooms'] });
    },
  });

  const openCreateModal = () => {
    setFormData({
      room_id: '',
      room_name: '',
      seating_capacity: '',
      floor: '',
      location: '',
      category: 'Meeting Room',
      amenities: [],
      is_active: true,
      description: '',
    });
    setEditModal({ open: true, room: null });
  };

  const openEditModal = (room) => {
    setFormData({ ...room });
    setEditModal({ open: true, room });
  };

  const closeModal = () => {
    setEditModal({ open: false, room: null });
    setFormData({});
  };

  const handleSubmit = () => {
    if (!formData.room_id || !formData.room_name || !formData.seating_capacity || !formData.category) {
      toast.error('Please fill all required fields');
      return;
    }

    const data = {
      ...formData,
      seating_capacity: parseInt(formData.seating_capacity),
    };

    if (editModal.room) {
      updateRoomMutation.mutate({ id: editModal.room.id, data });
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const handleAmenityToggle = (amenity) => {
    const amenities = formData.amenities || [];
    setFormData({
      ...formData,
      amenities: amenities.includes(amenity)
        ? amenities.filter(a => a !== amenity)
        : [...amenities, amenity],
    });
  };

  const availableAmenities = ['Smart TV', 'TV', 'Whiteboard', 'Video Conference', 'Teleconference', 'Projector', 'Coffee Machine', 'Sound System', 'WiFi'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Conference Rooms</h1>
            <p className="text-gray-500 mt-1">Configure and manage available conference rooms</p>
          </div>
          <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Room
          </Button>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms configured</h3>
              <p className="text-gray-500 mb-4">Add your first conference room</p>
              <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <Card key={room.id} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{room.room_name}</h3>
                      <p className="text-sm text-gray-500">{room.room_id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(room)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRoomMutation.mutate(room.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Capacity:</span>
                      <span className="font-medium">{room.seating_capacity} people</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Floor:</span>
                      <span className="font-medium">{room.floor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium">{room.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium">{room.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${room.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map((a, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editModal.open} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editModal.room ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Room ID *</Label>
                  <Input
                    value={formData.room_id || ''}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    placeholder="e.g., CR-006"
                  />
                </div>
                <div>
                  <Label>Room Name *</Label>
                  <Input
                    value={formData.room_name || ''}
                    onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                    placeholder="e.g., Conference Room C"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Seating Capacity *</Label>
                  <Input
                    type="number"
                    value={formData.seating_capacity || ''}
                    onChange={(e) => setFormData({ ...formData, seating_capacity: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input
                    value={formData.floor || ''}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="e.g., 3"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., West Wing"
                  />
                </div>
              </div>

              <div>
                <Label>Category *</Label>
                <Select value={formData.category || 'Meeting Room'} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting Room">Meeting Room</SelectItem>
                    <SelectItem value="Training Room">Training Room</SelectItem>
                    <SelectItem value="Board Room">Board Room</SelectItem>
                    <SelectItem value="Executive Suite">Executive Suite</SelectItem>
                    <SelectItem value="Huddle Room">Huddle Room</SelectItem>
                    <SelectItem value="Interview Room">Interview Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amenities</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableAmenities.map(amenity => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={(formData.amenities || []).includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                        className="rounded"
                      />
                      <Label className="cursor-pointer">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active (available for booking)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                {editModal.room ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}