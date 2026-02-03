import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Users, GitBranch, Shield, RefreshCw, CheckCircle, 
  AlertTriangle, FileCode, Database, Lock 
} from "lucide-react";

export default function ADIntegrationDocs() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Active Directory Integration Documentation
          </h1>
          <p className="text-gray-600">
            Manager hierarchy mapping and authentication with enterprise AD
          </p>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              The application integrates with enterprise Active Directory (AD) for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>User Authentication:</strong> SSO via AD credentials</li>
              <li><strong>Manager Hierarchy:</strong> Dynamically sourced from AD reporting structure</li>
              <li><strong>Hybrid Approval:</strong> Combines portal roles with AD manager chain</li>
              <li><strong>Auto-Sync:</strong> Manager changes in AD reflect automatically</li>
            </ul>
          </CardContent>
        </Card>

        {/* Architecture */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Hybrid Approval Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Hybrid Model:</strong> Portal roles define approval stages, 
                  while AD provides manager resolution within those stages.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                <p className="font-semibold text-gray-900">Approval Flow Logic:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li><strong>Stage 1 - Verification:</strong> Junior Admin (portal_role)</li>
                  <li><strong>Stage 2 - Manager:</strong> Employee's AD manager (manager_email from AD)</li>
                  <li><strong>Stage 3 - Admin Head:</strong> Admin Head (portal_role)</li>
                  <li><strong>Stage 4 - CRO:</strong> CRO (portal_role)</li>
                  <li><strong>Stage 5 - CFO:</strong> CFO (portal_role)</li>
                  <li><strong>Stage 6 - Finance:</strong> Finance Team (portal_role)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Entity Schema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              User Entity Schema (AD Fields)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "ad_user_id": "AD001",           // Unique AD identifier
  "manager_ad_id": "AD002",        // Manager's AD ID (from AD)
  "manager_name": "John Doe",      // Cached manager name
  "manager_email": "john@co.com",  // Cached manager email
  "department": "Engineering",      // From AD
  "designation": "VP Engineering", // From AD
  "portal_role": "admin_head",     // Assigned in portal
  "last_ad_sync": "2026-02-03T10:30:00Z"
}`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Sample AD Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Sample AD Hierarchy (Test Data)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: 'AD001', name: 'Rajesh Sharma', designation: 'CEO', manager: null, role: 'CFO' },
                { id: 'AD002', name: 'Anjali Mehta', designation: 'VP - Engineering', manager: 'Rajesh Sharma', role: 'Admin Head' },
                { id: 'AD003', name: 'Suresh Iyer', designation: 'Engineering Manager', manager: 'Anjali Mehta', role: 'Manager' },
                { id: 'AD004', name: 'Priya Nair', designation: 'Senior Developer', manager: 'Suresh Iyer', role: 'Employee' },
                { id: 'AD005', name: 'Amit Verma', designation: 'Junior Developer', manager: 'Suresh Iyer', role: 'Employee' },
                { id: 'AD006', name: 'Kavita Rao', designation: 'HR Manager', manager: 'Rajesh Sharma', role: 'Manager' },
                { id: 'AD007', name: 'Rohit Kulkarni', designation: 'HR Executive', manager: 'Kavita Rao', role: 'Employee' },
              ].map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{user.name}</span>
                      <Badge variant="outline" className="text-xs">{user.id}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.designation}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                    {user.manager && (
                      <p className="text-xs text-gray-500 mt-1">Reports to: {user.manager}</p>
                    )}
                    {!user.manager && (
                      <p className="text-xs text-red-500 mt-1">No Manager</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Backend Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Backend Implementation (Future)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                Requires <strong>Backend Functions</strong> to be enabled with AD connector
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">🔧 Backend Function: syncUserFromAD</p>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Trigger:</strong> User login, scheduled sync</p>
                  <p><strong>Actions:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Fetch user from AD (ad_user_id, department, designation)</li>
                    <li>Fetch manager from AD hierarchy (manager_ad_id)</li>
                    <li>Update User entity with AD data</li>
                    <li>Cache manager name and email</li>
                    <li>Set last_ad_sync timestamp</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">🔧 Backend Function: resolveApprover</p>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Input:</strong> claim_id, current_stage</p>
                  <p><strong>Logic:</strong></p>
                  <ul className="list-disc list-inside ml-4">
                    <li>If stage = "manager_approval" → use claim.employee's manager_email (from AD)</li>
                    <li>Else → use portal_role mapping (junior_admin, admin_head, etc.)</li>
                    <li>If employee has no manager → skip to next stage</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Test Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <p className="font-semibold text-gray-900">✅ Scenario 1: Employee with Manager</p>
                <p className="text-sm text-gray-600">
                  Priya Nair submits claim → Junior Admin verifies → Routes to Suresh Iyer (her AD manager) → Admin Head → CRO → CFO → Finance
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4 py-2">
                <p className="font-semibold text-gray-900">⚠️ Scenario 2: Top-Level User</p>
                <p className="text-sm text-gray-600">
                  Rajesh Sharma submits claim → No manager in AD → Skips manager approval → Goes directly to Admin Head
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-semibold text-gray-900">🔄 Scenario 3: Manager Change in AD</p>
                <p className="text-sm text-gray-600">
                  Amit's manager changes from Suresh to Priya in AD → Next sync updates manager_ad_id and manager_email → Future claims route to Priya
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Implementation Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { done: true, text: 'User entity updated with AD fields' },
                { done: true, text: 'Test users created with AD hierarchy' },
                { done: true, text: 'Documentation created' },
                { done: false, text: 'Enable Backend Functions in Base44' },
                { done: false, text: 'Configure AD connector with credentials' },
                { done: false, text: 'Implement syncUserFromAD backend function' },
                { done: false, text: 'Implement resolveApprover backend function' },
                { done: false, text: 'Add scheduled task for periodic AD sync' },
                { done: false, text: 'Update approval workflow to call resolveApprover' },
                { done: false, text: 'Test with live AD integration' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2">
                  {item.done ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={item.done ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}