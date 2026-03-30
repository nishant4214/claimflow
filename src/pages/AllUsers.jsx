import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import { ROLE_LABELS } from '@/lib/rbac';
import { format } from 'date-fns';
import { useState } from 'react';

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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.department?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">All Users</h1>
        </div>
        <p className="text-gray-600">Total Users in Application: <strong>{users.length}</strong></p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-base">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Email</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Department</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Designation</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Portal Role</TableHead>
                    <TableHead className="text-gray-700 font-semibold">System Access</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => {
                    const role = u.portal_role || 'employee';
                    return (
                      <TableRow key={u.id} className="border-b hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {u.full_name?.charAt(0) || '?'}
                            </div>
                            <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700 text-sm">{u.email || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700 text-sm">{u.department || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-700 text-sm">{u.designation || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={u.role === 'admin' ? 'default' : 'outline'} 
                            className={`text-xs ${u.role === 'admin' ? 'bg-red-600' : ''}`}
                          >
                            {u.role || 'user'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600 text-sm">
                            {u.created_date ? format(new Date(u.created_date), 'dd MMM yyyy') : '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-600">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
          </div>
        </CardContent>
      </Card>
    </div>
  );
}