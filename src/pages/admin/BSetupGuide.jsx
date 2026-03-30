import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, BookOpen } from "lucide-react";

export default function BSetupGuide() {
  const steps = [
    {
      title: "Prerequisites",
      description: "Ensure you have admin access and system permissions",
      items: ["Admin or Super Admin role", "Access to System Settings", "Understanding of approval workflows"]
    },
    {
      title: "Configuration",
      description: "Configure system settings and roles",
      items: ["Set up role permissions", "Configure notification templates", "Define approval workflows"]
    },
    {
      title: "Testing",
      description: "Verify system functionality",
      items: ["Create test users", "Test claim submission flow", "Verify approval routing"]
    },
    {
      title: "Deployment",
      description: "Deploy system to production",
      items: ["Backup existing data", "Run database migrations", "Enable system for users"]
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">B Setup Guide</p>
          <p className="text-blue-800 mt-1">Follow this guide to configure basic system setup for all users.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {steps.map((step, idx) => (
          <Card key={idx} className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                  {idx + 1}
                </div>
                {step.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {step.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• Review all settings before deploying to production</p>
          <p>• Ensure proper backups are in place</p>
          <p>• Test workflows with sample data first</p>
          <p>• Document any customizations made</p>
        </CardContent>
      </Card>
    </div>
  );
}