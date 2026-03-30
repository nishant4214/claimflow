import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield, UserPlus, Users, Search, Edit, Mail,
  CheckCircle, AlertCircle, Lock, Eye
} from "lucide-react";
import { toast } from 'sonner';
import { ROLE_LABELS, ALL_ROLES, ROLE_PERMISSIONS } from '@/lib/rbac';

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

const APPROVAL_STAGES = [
  { key: 'junior_admin', label: 'Junior Admin', desc: 'Verifies submitted claims' },
  { key: 'manager', label: 'Manager / HOD', desc: 'First-level approver' },
  { key: 'admin_head', label: 'Admin Head', desc: 'Senior approval & full access' },
  { key: 'cro', label: 'CRO', desc: 'Compliance review officer' },
  { key: 'cfo', label: 'CFO', desc: 'Final financial approval' },
  { key: 'finance', label: 'Finance', desc: 'Processes payments' },
];

export default function RoleAccessManagement() {
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [invitePortalRole, setInvitePortalRole] = useState('employee');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      const role = u?.portal_role || u?.role;
      if (!['admin_head', 'admin', 'super_admin'].includes(role)) {
        window.location.href = '/Dashboard';
      }
    });
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users-ram'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, portal_role }) => base44.entities.User.update(id, { portal_role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users-ram']);
      toast.success('Role updated successfully');
      setEditUser(null);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, portal_role, full_name, department, designation }) => {
      await base44.users.inviteUser(email, 'user');
      await new Promise(r => setTimeout(r, 1000));
      const fresh = await base44.entities.User.list('-created_date', 200);
      const newU = fresh.find(u => u.email === email);
      if (newU) {
        await base44.entities.User.update(newU.id, { portal_role, full_name, department, designation });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users-ram']);
      toast.success('User invited and role assigned');
      setInviteEmail(''); setInviteName(''); setInviteDepartment(''); setInviteDesignation('');
      setInvitePortalRole('employee');
    },
    onError: () => toast.error('Failed to invite user'),
  });

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.department?.toLowerCase().includes(s);
  });

  const roleCounts = ALL_ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => (u.portal_role || 'employee') === r).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Role & Access Management</h1>
              <p className="text-gray-500 text-sm">Manage user roles, permissions and access levels</p>
            </div>
          </div>
        </div>

        {/* Role Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {APPROVAL_STAGES.map(stage => (
            <Card key={stage.key} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{stage.label}</p>
                <p className="text-2xl font-bold text-gray-900">{roleCounts[stage.key] || 0}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{stage.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> User Roles</TabsTrigger>
            <TabsTrigger value="invite" className="gap-2"><UserPlus className="w-4 h-4" /> Invite User</TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2"><Eye className="w-4 h-4" /> Access Matrix</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── USER ROLES TAB ── */}
        {tab === 'users' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">All Users & Roles</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Portal Role</TableHead>
                      <TableHead>System Access</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => {
                      const role = u.portal_role || 'employee';
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                {u.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-gray-900">{u.full_name || '—'}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{u.department || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                              {u.role || 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => { setEditUser(u); setEditRole(u.portal_role || 'employee'); }}>
                              <Edit className="w-3 h-3" /> Edit Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── INVITE TAB ── */}
        {tab === 'invite' && (
          <Card className="border-0 shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4 text-indigo-600" /> Invite New User
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address *</Label>
                  <Input placeholder="user@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name *</Label>
                  <Input placeholder="Full Name" value={inviteName} onChange={e => setInviteName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department *</Label>
                  <Input placeholder="e.g. Sales, IT, HR" value={inviteDepartment} onChange={e => setInviteDepartment(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Designation *</Label>
                  <Input placeholder="e.g. Manager, Executive" value={inviteDesignation} onChange={e => setInviteDesignation(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Portal Role *</Label>
                  <Select value={invitePortalRole} onValueChange={setInvitePortalRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter(r => r !== 'super_admin').map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700 border border-indigo-100">
                <strong>Role: {ROLE_LABELS[invitePortalRole]}</strong> — Access: {ROLE_PERMISSIONS[invitePortalRole]?.routes?.join(', ')}
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!inviteEmail || !inviteName || !inviteDepartment || !inviteDesignation || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate({ email: inviteEmail, portal_role: invitePortalRole, full_name: inviteName, department: inviteDepartment, designation: inviteDesignation })}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── ACCESS MATRIX TAB ── */}
        {tab === 'matrix' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-4 h-4 text-purple-600" /> Role Access Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="min-w-[180px]">Role</TableHead>
                    <TableHead>Accessible Modules</TableHead>
                    <TableHead>Approval Level</TableHead>
                    <TableHead>Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_ROLES.filter(r => r !== 'super_admin').map(r => {
                    const perms = ROLE_PERMISSIONS[r];
                    const routes = perms?.routes.includes('*') ? ['All modules'] : perms?.routes || [];
                    const approvalStage = APPROVAL_STAGES.find(s => s.key === r);
                    return (
                      <TableRow key={r}>
                        <TableCell>
                          <Badge className={`text-xs ${ROLE_COLORS[r] || 'bg-gray-100 text-gray-700'}`}>
                            {ROLE_LABELS[r]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-lg">
                            {routes.slice(0, 8).map(rt => (
                              <span key={rt} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{rt}</span>
                            ))}
                            {routes.length > 8 && (
                              <span className="text-[10px] text-gray-400">+{routes.length - 8} more</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {approvalStage ? (
                            <span className="text-xs text-gray-600">{approvalStage.desc}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-gray-700">{roleCounts[r] || 0}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role — {editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <span className="font-medium">{editUser?.email}</span><br />
              <span className="text-xs">{editUser?.department} · {editUser?.designation}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Portal Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter(r => r !== 'super_admin').map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editRole && (
              <div className="p-2.5 bg-purple-50 rounded-lg text-[11px] text-purple-700 border border-purple-100">
                <strong>{ROLE_LABELS[editRole]}</strong> — {APPROVAL_STAGES.find(s => s.key === editRole)?.desc || 'Standard access'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              disabled={updateRoleMutation.isPending || editRole === editUser?.portal_role}
              onClick={() => updateRoleMutation.mutate({ id: editUser.id, portal_role: editRole })}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updateRoleMutation.isPending ? 'Saving...' : 'Save Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}