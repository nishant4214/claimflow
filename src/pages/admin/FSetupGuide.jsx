import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Zap } from "lucide-react";

export default function FSetupGuide() {
  const phases = [
    {
      title: "Phase 1: Initial Setup",
      description: "Complete foundational configuration",
      items: ["Enable authentication", "Configure role hierarchy", "Set up default workflows"]
    },
    {
      title: "Phase 2: Advanced Configuration",
      description: "Configure advanced features and integrations",
      items: ["Setup email notifications", "Configure approval rules", "Enable API integrations"]
    },
    {
      title: "Phase 3: Optimization",
      description: "Optimize system performance and user experience",
      items: ["Fine-tune approval workflows", "Optimize email templates", "Setup monitoring and alerts"]
    },
    {
      title: "Phase 4: Go Live",
      description: "Deploy system to production environment",
      items: ["Final testing and QA", "User training and documentation", "Monitoring and support"]
    },
    {
      title: "Phase 5: Maintenance",
      description: "Ongoing system maintenance and updates",
      items: ["Regular backups", "Performance monitoring", "User support and updates"]
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex gap-3">
        <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-900">
          <p className="font-medium">F Setup Guide (Full Setup)</p>
          <p className="text-indigo-800 mt-1">Complete end-to-end setup guide for full system implementation and ongoing management.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {phases.map((phase, idx) => (
          <Card key={idx} className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                  {idx + 1}
                </div>
                {phase.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {phase.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            Critical Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>✓ All roles and permissions configured correctly</p>
          <p>✓ Email templates tested and verified</p>
          <p>✓ Approval workflows documented</p>
          <p>✓ Database backups scheduled</p>
          <p>✓ User access controls in place</p>
          <p>✓ System monitoring enabled</p>
          <p>✓ Support team trained</p>
        </CardContent>
      </Card>
    </div>
  );
}