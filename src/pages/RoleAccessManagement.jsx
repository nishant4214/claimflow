import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Edit, Settings } from "lucide-react";
import { ROLE_LABELS } from '@/lib/rbac';

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

export default function RoleAccessManagement() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');

  // Edit form state
  const [editRole, setEditRole] = useState('');
  const [editName, setEditName] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter users
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && (u.portal_role || 'employee') !== roleFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.users.inviteUser(data.email, 'user');
      if (data.name) {
        await base44.auth.updateMe({ full_name: data.name });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('employee');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.User.update(data.id, {
        portal_role: data.portal_role,
        full_name: data.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialogOpen(false);
      setEditUser(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.User.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
    },
  });

  const handleEdit = (user) => {
    setEditUser(user);
    setEditRole(user.portal_role || 'employee');
    setEditName(user.full_name || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: editUser.id,
      portal_role: editRole,
      full_name: editName,
    });
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
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
          <p className="text-gray-500 mt-1">Manage the app's users and their roles</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 hover:bg-gray-800 text-white gap-2">
              <Plus className="w-4 h-4" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>Send an invitation to a new user to join the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name (optional)</label>
                <Input
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Initial Role</label>
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
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail}
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs and Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 border-b">
              <button className="px-4 py-2 border-b-2 border-gray-900 text-gray-900 font-medium text-sm">
                Users
              </button>
              <button className="px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                Pending requests
              </button>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search by Email or Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 bg-white border-gray-300">
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
          <CardTitle className="text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Role</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Email</TableHead>
                    <TableHead className="text-gray-700 font-semibold">portal_role</TableHead>
                    <TableHead className="text-right pr-6 text-gray-700 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => {
                    const role = u.portal_role || 'employee';
                    return (
                      <TableRow key={u.id} className="border-b hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                            {u.designation && (
                              <p className="text-sm text-gray-500">{u.designation}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700">{u.role || 'user'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700">{u.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(u)}
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Portal Role</label>
                <Select value={editRole} onValueChange={setEditRole}>
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
              <div className="text-sm text-gray-600">
                <p><strong>Email:</strong> {editUser.email}</p>
                <p><strong>System Access:</strong> {editUser.role || 'user'}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
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
              Are you sure you want to delete {deleteConfirm?.full_name}? This action cannot be undone.
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