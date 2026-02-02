import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Copy, CheckCircle, ArrowLeft, FileText,
  Shield, Workflow, Info
} from "lucide-react";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const DEMO_USERS = [
  { 
    email: 'employee@claimflow.demo', 
    name: 'John Employee',
    role: 'Employee', 
    color: 'bg-blue-100 text-blue-700',
    description: 'Can submit and track expense claims',
    permissions: ['Submit claims', 'View own claims', 'Upload documents', 'Track status']
  },
  { 
    email: 'junior.admin@claimflow.demo', 
    name: 'Sarah Admin',
    role: 'Junior Admin', 
    color: 'bg-cyan-100 text-cyan-700',
    description: 'First-level verification of submitted claims',
    permissions: ['Verify claims', 'Send back for correction', 'Approve/Reject', 'View all claims']
  },
  { 
    email: 'manager@claimflow.demo', 
    name: 'Mike Manager',
    role: 'Manager/HOD', 
    color: 'bg-purple-100 text-purple-700',
    description: 'Departmental approval authority',
    permissions: ['Approve departmental claims', 'Manage team submissions', 'View reports']
  },
  { 
    email: 'admin.head@claimflow.demo', 
    name: 'Linda Head',
    role: 'Admin Head', 
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Final approval for normal reimbursements',
    permissions: ['Final approval', 'Manage categories', 'Configure workflows', 'View analytics']
  },
  { 
    email: 'cro@claimflow.demo', 
    name: 'Robert CRO',
    role: 'Chief Revenue Officer', 
    color: 'bg-emerald-100 text-emerald-700',
    description: 'Approves sales promotion claims',
    permissions: ['Approve sales promotion claims', 'Review marketing expenses']
  },
  { 
    email: 'cfo@claimflow.demo', 
    name: 'Patricia CFO',
    role: 'Chief Financial Officer', 
    color: 'bg-green-100 text-green-700',
    description: 'Final approval for high-value and sales claims',
    permissions: ['Final approval for sales claims', 'View financial reports', 'Budget oversight']
  },
  { 
    email: 'finance@claimflow.demo', 
    name: 'David Finance',
    role: 'Finance Team', 
    color: 'bg-amber-100 text-amber-700',
    description: 'Processes approved claims and handles payments',
    permissions: ['Process payments', 'Mark claims as paid', 'Download reports', 'Manage payment queue']
  },
];

const WORKFLOWS = [
  {
    name: 'Normal Reimbursement',
    flow: ['Employee submits', 'Junior Admin verifies', 'Manager approves', 'Admin Head approves', 'Finance pays'],
    examples: ['Travel expenses', 'Food expenses', 'Hotel accommodation', 'Miscellaneous']
  },
  {
    name: 'Sales Promotion',
    flow: ['Employee submits', 'Manager approves', 'CRO approves', 'CFO approves', 'Finance pays'],
    examples: ['Client gifts', 'Liquor expenses', 'Client entertainment', 'Marketing events']
  },
];

export default function DemoCredentials() {
  const copyEmail = (email) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied to clipboard');
  };

  const copyAllCredentials = () => {
    const credentials = DEMO_USERS.map(u => 
      `${u.name} (${u.role}): ${u.email}`
    ).join('\n');
    navigator.clipboard.writeText(credentials);
    toast.success('All credentials copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" className="mb-4 -ml-2 text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                Demo Test Accounts
              </h1>
              <p className="text-gray-500 mt-1">
                Pre-configured users for testing the complete approval workflow
              </p>
            </div>
            <Button variant="outline" onClick={copyAllCredentials}>
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How to Test with Demo Users</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                  <li>Click the email address to copy it</li>
                  <li>Logout from your current session (if logged in)</li>
                  <li>On the login page, paste the email and click "Continue with Email"</li>
                  <li>Check your Base44 dashboard for the magic login link</li>
                  <li>Login and test the role-specific features</li>
                  <li>Repeat to test different roles and approval workflows</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Users Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {DEMO_USERS.map((user) => (
            <Card key={user.email} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className={`${user.color} mb-2`}>{user.role}</Badge>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <CardDescription className="mt-1">{user.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyEmail(user.email)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    className="p-3 bg-gray-50 rounded-lg font-mono text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => copyEmail(user.email)}
                  >
                    {user.email}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Permissions:</p>
                    <div className="space-y-1">
                      {user.permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          {perm}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Approval Workflows */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-600" />
              Approval Workflows
            </CardTitle>
            <CardDescription>
              Two distinct approval flows based on claim type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {WORKFLOWS.map((workflow, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">{workflow.name}</h3>
                  <div className="space-y-2 mb-4">
                    {workflow.flow.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                          {stepIdx + 1}
                        </div>
                        <span className="text-sm text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Example categories:</p>
                    <div className="flex flex-wrap gap-1">
                      {workflow.examples.map((ex, exIdx) => (
                        <Badge key={exIdx} variant="secondary" className="text-xs">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}