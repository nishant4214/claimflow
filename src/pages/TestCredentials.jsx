import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, User, Shield } from "lucide-react";
import { toast } from 'sonner';

const TEST_ACCOUNTS = [
  {
    name: 'John Employee',
    email: 'employee@test.com',
    password: 'Employee@123',
    role: 'employee',
    permissions: 'Submit claims, view own claims'
  },
  {
    name: 'Sarah Admin',
    email: 'junioradmin@test.com',
    password: 'JuniorAdmin@123',
    role: 'junior_admin',
    permissions: 'Verify claims, approve basic claims'
  },
  {
    name: 'Mike Manager',
    email: 'manager@test.com',
    password: 'Manager@123',
    role: 'manager',
    permissions: 'Approve department claims'
  },
  {
    name: 'Linda Head',
    email: 'adminhead@test.com',
    password: 'AdminHead@123',
    role: 'admin_head',
    permissions: 'Final admin approval, manage categories'
  },
  {
    name: 'Robert CRO',
    email: 'cro@test.com',
    password: 'CRO@123',
    role: 'cro',
    permissions: 'High-level approvals'
  },
  {
    name: 'Patricia CFO',
    email: 'cfo@test.com',
    password: 'CFO@123',
    role: 'cfo',
    permissions: 'Financial approvals'
  },
  {
    name: 'David Finance',
    email: 'finance@test.com',
    password: 'Finance@123',
    role: 'finance',
    permissions: 'Process payments'
  },
];

export default function TestCredentials() {
  const copyCredentials = (email, password) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
    toast.success('Credentials copied!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Login Credentials</h1>
          <p className="text-gray-500 mt-2">
            Use these credentials to test different user roles and workflows
          </p>
        </div>

        <div className="grid gap-4">
          {TEST_ACCOUNTS.map((account) => (
            <Card key={account.email} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {account.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {account.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Email:</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{account.email}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Password:</span>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-semibold">{account.password}</code>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {account.permissions}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCredentials(account.email, account.password)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> These are test credentials. Click the copy button to copy email and password, 
              then use them on the login page to test different user roles.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}