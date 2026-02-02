import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, Mail, Shield, Users, AlertCircle,
  ArrowLeft, CheckCircle, Copy, Info
} from "lucide-react";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DEMO_USERS = [
  { email: 'employee@claimflow.demo', role: 'employee', portal_role: 'employee', full_name: 'John Employee' },
  { email: 'junior.admin@claimflow.demo', role: 'user', portal_role: 'junior_admin', full_name: 'Sarah Admin' },
  { email: 'manager@claimflow.demo', role: 'user', portal_role: 'manager', full_name: 'Mike Manager' },
  { email: 'admin.head@claimflow.demo', role: 'user', portal_role: 'admin_head', full_name: 'Linda Head' },
  { email: 'cro@claimflow.demo', role: 'user', portal_role: 'cro', full_name: 'Robert CRO' },
  { email: 'cfo@claimflow.demo', role: 'user', portal_role: 'cfo', full_name: 'Patricia CFO' },
  { email: 'finance@claimflow.demo', role: 'user', portal_role: 'finance', full_name: 'David Finance' },
];

export default function UserManagement() {
  const [user, setUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [invitePortalRole, setInvitePortalRole] = useState('employee');
  const [inviteName, setInviteName] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 100),
    retry: 1,
    staleTime: 30000,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role, portal_role, full_name, department, designation }) => {
      await base44.users.inviteUser(email, role);
      
      // Wait a moment for user to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch fresh user list to get the new user
      const freshUsers = await base44.entities.User.list('-created_date', 200);
      const newUser = freshUsers.find(u => u.email === email);
      
      if (newUser) {
        await base44.entities.User.update(newUser.id, { 
          portal_role, 
          full_name,
          department: department || 'General',
          designation: designation || 'Employee'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      toast.success('User invited successfully with portal role assigned');
      setInviteEmail('');
      setInviteName('');
    },
    onError: (error) => {
      toast.error('Failed to invite user: ' + (error.message || 'Unknown error'));
    }
  });

  const inviteDemoUsers = async () => {
    toast.info('Inviting demo users...');
    for (const demoUser of DEMO_USERS) {
      const exists = users.find(u => u.email === demoUser.email);
      if (!exists) {
        try {
          await base44.users.inviteUser(demoUser.email, demoUser.role);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const freshUsers = await base44.entities.User.list('-created_date', 200);
          const newUser = freshUsers.find(u => u.email === demoUser.email);
          
          if (newUser) {
            await base44.entities.User.update(newUser.id, { 
              portal_role: demoUser.portal_role,
              full_name: demoUser.full_name,
              department: 'Demo',
              designation: demoUser.portal_role.replace('_', ' ')
            });
          }
          toast.success(`✓ ${demoUser.full_name}`);
        } catch (e) {
          toast.error(`✗ ${demoUser.email}`);
        }
      }
    }
    queryClient.invalidateQueries(['all-users']);
    toast.success('All demo users setup complete!');
  };

  const copyCredentials = () => {
    const credentials = DEMO_USERS.map(u => `${u.full_name} (${u.portal_role}): ${u.email}`).join('\n');
    navigator.clipboard.writeText(credentials);
    toast.success('Demo credentials copied to clipboard');
  };

  const userRole = user?.role;
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500">Only admins can manage users.</p>
          <Link to={createPageUrl('Dashboard')}>
            <Button className="mt-6" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">
            Invite users and manage access to the portal
          </p>
        </div>

        {/* Demo Users Setup */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Demo Users for Testing
            </CardTitle>
            <CardDescription>
              Quick setup with pre-configured test users for each role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {DEMO_USERS.map(demo => (
                <div key={demo.email} className="p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{demo.full_name}</p>
                      <p className="text-xs text-gray-500">{demo.email}</p>
                      <Badge className="mt-1 text-xs" variant="outline">
                        {demo.portal_role.replace('_', ' ')}
                      </Badge>
                    </div>
                    {users.find(u => u.email === demo.email) && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={inviteDemoUsers}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={inviteMutation.isPending}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite All Demo Users
              </Button>
              <Button 
                variant="outline"
                onClick={copyCredentials}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Credentials
              </Button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Simple Setup</p>
                  <p className="text-blue-700 mt-1">
                    Create test users directly in Base44 dashboard (Settings → Users) and assign their portal_role. 
                    Then login using standard Base44 authentication.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Single User */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              Invite New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Input
                  placeholder="Sales, IT, HR, etc."
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input
                  placeholder="Manager, Executive, etc."
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Portal Role (Approval Level) *</Label>
                <Select value={invitePortalRole} onValueChange={setInvitePortalRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee (Submit Claims)</SelectItem>
                    <SelectItem value="junior_admin">Junior Admin (Verify)</SelectItem>
                    <SelectItem value="manager">Manager/HOD (Approve)</SelectItem>
                    <SelectItem value="admin_head">Admin Head (Approve)</SelectItem>
                    <SelectItem value="cro">CRO (Approve)</SelectItem>
                    <SelectItem value="cfo">CFO (Final Approve)</SelectItem>
                    <SelectItem value="finance">Finance (Process Payment)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>System Access Level</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => inviteMutation.mutate({
                email: inviteEmail,
                role: inviteRole,
                portal_role: invitePortalRole,
                full_name: inviteName,
                department: inviteDepartment,
                designation: inviteDesignation
              })}
              disabled={!inviteEmail || !inviteName || !inviteDepartment || !inviteDesignation || inviteMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </CardContent>
        </Card>

        {/* Current Users */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Current Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <p className="text-gray-600">Failed to load users</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => queryClient.invalidateQueries(['all-users'])}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Portal Role</TableHead>
                    <TableHead>System Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.designation || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.department || 'Not Set'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          {user.portal_role?.replace('_', ' ').toUpperCase() || 'EMPLOYEE'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}