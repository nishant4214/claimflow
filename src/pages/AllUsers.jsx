import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { ROLE_LABELS } from '@/lib/rbac';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROLE_COLORS = {
  employee: 'bg-gray-100 text-gray-700',
  junior_admin: 'bg-sky-100 text-sky-700',
  manager: 'bg-indigo-100 text-indigo-700',
  admin_head: 'bg-purple-100 text-purple-700',
  functional_lead: 'bg-teal-100 text-teal-700',
  cro: 'bg-orange-100 text-orange-700',
  cfo: 'bg-amber-100 text-amber-700',
  finance: 'bg-green-100 text-green-700',
  admin: 'bg-red-100 text-red-700',
  super_admin: 'bg-pink-100 text-pink-700',
};

export default function AllUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');

  // Edit form
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    portal_role: 'employee',
    role: 'user',
    department: '',
    designation: '',
  });

  // Fetch users using service role for admin access
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['all-users-list'],
    queryFn: async () => {
      try {
        const result = await base44.asServiceRole.entities.User.list();
        console.log('Fetched users:', result);
        return result || [];
      } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
      }
    },
    retry: 2,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.users.inviteUser(data.email, 'user');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-list'] });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('employee');
      toast.success('User invited successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to invite user');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.User.update(data.id, {
        full_name: data.full_name,
        portal_role: data.portal_role,
        role: data.role,
        department: data.department,
        designation: data.designation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-list'] });
      setEditOpen(false);
      setEditingUser(null);
      toast.success('User updated successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update user');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.User.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-list'] });
      setDeleteConfirm(null);
      toast.success('User deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete user');
    },
  });

  // Filter users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && (u.portal_role || 'employee') !== roleFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.department?.toLowerCase().includes(s)
    );
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name || '',
      portal_role: user.portal_role || 'employee',
      role: user.role || 'user',
      department: user.department || '',
      designation: user.designation || '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateMutation.mutate({
      id: editingUser.id,
      ...editFormData,
    });
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage app users, roles, and access</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800 gap-2">
              <Plus className="w-4 h-4" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>Send invitation to a new user to join the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Initial Portal Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all roles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-600 font-medium">Error loading users</p>
              <p className="text-sm text-gray-500 mt-2">{error?.message || 'Please try again'}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Portal Role</TableHead>
                    <TableHead className="font-semibold">System Role</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => {
                    const role = u.portal_role || 'employee';
                    return (
                      <TableRow key={u.id} className="border-b hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                              {u.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                              <p className="text-xs text-gray-500">{u.designation || '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">{u.email}</TableCell>
                        <TableCell className="text-gray-700">{u.department || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${ROLE_COLORS[role] || 'bg-gray-100'}`}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                            {u.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {u.created_date ? format(new Date(u.created_date), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(u)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600"
                            onClick={() => setDeleteConfirm(u)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Designation</label>
                <Input
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Portal Role</label>
                <Select value={editFormData.portal_role} onValueChange={(value) => setEditFormData({ ...editFormData, portal_role: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">System Role (Access Level)</label>
                <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p><strong>Email:</strong> {editingUser.email}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.full_name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}