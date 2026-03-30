import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import { ROLE_LABELS } from '@/lib/rbac';
import { format } from 'date-fns';
import { exportUsersToExcel } from '@/utils/excelExporter';

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

export default function UserSummaryTable({ users = [], search = '', onSearch, loading = false }) {
  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.department?.toLowerCase().includes(s);
  });

  const getManagerName = (managerId) => {
    if (!managerId) return '—';
    const manager = users.find(u => u.id === managerId);
    return manager ? manager.full_name : '—';
  };

  const handleExport = () => {
    exportUsersToExcel(filteredUsers);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">All Users Summary ({filteredUsers.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search by name, email, department..." 
                value={search} 
                onChange={(e) => onSearch(e.target.value)}
                className="pl-10 h-9 text-sm" 
              />
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 h-9"
              onClick={handleExport}
              disabled={filteredUsers.length === 0}
            >
              <Download className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">No users found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-[200px]">Name & Email</TableHead>
                <TableHead className="min-w-[120px]">Department</TableHead>
                <TableHead className="min-w-[140px]">Designation</TableHead>
                <TableHead className="min-w-[130px]">Portal Role</TableHead>
                <TableHead className="min-w-[110px]">System Access</TableHead>
                <TableHead className="min-w-[150px]">Manager</TableHead>
                <TableHead className="min-w-[130px]">Created Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(u => {
                const role = u.portal_role || 'employee';
                return (
                  <TableRow key={u.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{u.full_name || '—'}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{u.department || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{u.designation || '—'}</span>
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
                      <span className="text-sm text-gray-600">
                        {getManagerName(u.manager_id) !== '—' ? (
                          <Badge variant="secondary" className="text-xs">
                            {getManagerName(u.manager_id)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {u.created_date ? format(new Date(u.created_date), 'dd MMM yyyy') : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="px-6 py-3 bg-gray-50 border-t text-xs text-gray-600">
          <strong>Total Users:</strong> {filteredUsers.length} / {users.length}
        </div>
      </CardContent>
    </Card>
  );
}