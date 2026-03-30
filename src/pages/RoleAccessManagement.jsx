import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import UserSummaryTable from '@/components/RoleAccessComponents/UserSummaryTable';
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, UserPlus, Users, Search, Edit, Mail, Trash2, Copy, ChevronRight,
  CheckCircle, AlertCircle, Lock, Eye, ArrowRight, ExternalLink
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
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesig, setEditDesig] = useState('');
  const [editManager, setEditManager] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [invitePortalRole, setInvitePortalRole] = useState('employee');
  const [inviteManager, setInviteManager] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
      const role = u?.portal_role || u?.role;
      if (!['admin_head', 'admin', 'super_admin'].includes(role)) {
        window.location.href = '/Dashboard';
      }
    });
  }, []);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['all-users-ram'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users-ram']);
      toast.success('User updated successfully');
      setEditUser(null);
    },
    onError: (err) => toast.error('Failed to update: ' + err.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users-ram']);
      toast.success('User deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error('Cannot delete: ' + err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, portal_role, full_name, department, designation, manager_id }) => {
      await base44.users.inviteUser(email, 'user');
      await new Promise(r => setTimeout(r, 1000));
      const fresh = await base44.entities.User.list('-created_date', 500);
      const newU = fresh.find(u => u.email === email);
      if (newU) {
        await base44.entities.User.update(newU.id, { portal_role, full_name, department, designation, manager_id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users-ram']);
      toast.success('User invited and role assigned');
      setInviteEmail('');
      setInviteName('');
      setInviteDepartment('');
      setInviteDesignation('');
      setInvitePortalRole('employee');
      setInviteManager('');
    },
    onError: (err) => toast.error('Failed to invite: ' + err.message),
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

  const managerOptions = users.filter(u => ['manager', 'admin_head', 'cro', 'cfo'].includes(u.portal_role || 'employee'));

  const getManagerName = (managerId) => {
    if (!managerId) return '—';
    const manager = users.find(u => u.id === managerId);
    return manager ? `${manager.full_name} (${ROLE_LABELS[manager.portal_role] || 'User'})` : '—';
  };

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
              <p className="text-gray-500 text-sm">Manage users, roles, permissions, approval chains & manager mappings</p>
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
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> All Users (CRUD)</TabsTrigger>
            <TabsTrigger value="invite" className="gap-2"><UserPlus className="w-4 h-4" /> Invite New User</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2"><ArrowRight className="w-4 h-4" /> Approval Flows</TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2"><Eye className="w-4 h-4" /> Access Matrix</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── ALL USERS TAB (CRUD) ── */}
        {tab === 'users' && (
          <div className="space-y-6">
            <UserSummaryTable 
              users={users} 
              search={search} 
              onSearch={setSearch}
              loading={isLoading}
            />
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Edit className="w-4 h-4" /> User Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  <p>Click on a user row in the summary above to view details, or use the actions below:</p>
                </div>
                <div className="space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-gray-400">No users to display</p>
                  ) : (
                    <div className="grid gap-2 max-h-96 overflow-y-auto">
                      {filteredUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{u.full_name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                              onClick={() => { 
                                setEditUser(u); 
                                setEditRole(u.portal_role || 'employee');
                                setEditName(u.full_name || '');
                                setEditDept(u.department || '');
                                setEditDesig(u.designation || '');
                                setEditManager(u.manager_id || '');
                              }}>
                              <Edit className="w-3 h-3" /> Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1"
                              onClick={() => setDeleteConfirm(u)}>
                              <Trash2 className="w-3 h-3" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── INVITE NEW USER TAB ── */}
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
                <div className="space-y-1.5">
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
                {invitePortalRole === 'employee' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Manager (Approver)</Label>
                    <Select value={inviteManager} onValueChange={setInviteManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No Manager</SelectItem>
                        {managerOptions.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name} ({ROLE_LABELS[m.portal_role]})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700 border border-indigo-100">
                <strong>Role: {ROLE_LABELS[invitePortalRole]}</strong> — Access: {ROLE_PERMISSIONS[invitePortalRole]?.routes?.slice(0, 3).join(', ')}...
              </div>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!inviteEmail || !inviteName || !inviteDepartment || !inviteDesignation || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate({ email: inviteEmail, portal_role: invitePortalRole, full_name: inviteName, department: inviteDepartment, designation: inviteDesignation, manager_id: inviteManager || null })}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── APPROVAL FLOWS TAB ── */}
        {tab === 'approvals' && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRight className="w-4 h-4 text-amber-600" /> Manager & Approval Chain Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <strong>Approval Flow Structure:</strong><br/>
                Employee (submits) → Manager (approves) → Admin Head (reviews) → CRO (compliance) → CFO (final) → Finance (payment)
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Assigned Manager</TableHead>
                    <TableHead className="text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.portal_role === 'employee' || !u.portal_role).map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{emp.department || '—'}</TableCell>
                      <TableCell>
                        {emp.manager_id ? (
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">{getManagerName(emp.manager_id)}</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => {
                            setEditUser(emp);
                            setEditManager(emp.manager_id || '');
                          }}>
                          Assign Manager
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                            {routes.slice(0, 5).map(rt => (
                              <span key={rt} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{rt}</span>
                            ))}
                            {routes.length > 5 && (
                              <span className="text-[10px] text-gray-400">+{routes.length - 5}</span>
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

      {/* Edit User Dialog (Full CRUD) */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 break-all">
              <span className="font-medium">{editUser?.email}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Input value={editDept} onChange={e => setEditDept(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Designation</Label>
                <Input value={editDesig} onChange={e => setEditDesig(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Portal Role</Label>
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
              {editRole === 'employee' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Assign Manager / Approver</Label>
                  <Select value={editManager} onValueChange={setEditManager}>
                    <SelectTrigger>
                      <SelectValue placeholder="No Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Manager</SelectItem>
                      {managerOptions.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name} ({ROLE_LABELS[m.portal_role]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              disabled={updateUserMutation.isPending}
              onClick={() => updateUserMutation.mutate({ 
                id: editUser.id, 
                data: { 
                  full_name: editName,
                  department: editDept,
                  designation: editDesig,
                  portal_role: editRole,
                  manager_id: editRole === 'employee' && editManager ? editManager : null
                } 
              })}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.full_name}</strong> ({deleteConfirm?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
              onClick={() => deleteUserMutation.mutate(deleteConfirm.id)}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </DialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}