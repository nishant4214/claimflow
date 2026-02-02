import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function SLAIndicator({ slaDate, submissionDate }) {
  if (!slaDate) return null;
  
  const today = new Date();
  const sla = parseISO(slaDate);
  const daysRemaining = differenceInDays(sla, today);
  const totalDays = differenceInDays(sla, parseISO(submissionDate));
  const daysElapsed = totalDays - daysRemaining;
  
  let config = {
    color: 'text-green-600 bg-green-50',
    icon: Clock,
    label: `${daysRemaining} days left`
  };
  
  if (daysRemaining <= 3) {
    config = {
      color: 'text-red-600 bg-red-50',
      icon: AlertCircle,
      label: daysRemaining <= 0 ? 'Overdue!' : `${daysRemaining} days left - Urgent!`
    };
  } else if (daysRemaining <= 10) {
    config = {
      color: 'text-amber-600 bg-amber-50',
      icon: AlertTriangle,
      label: `${daysRemaining} days left`
    };
  }
  
  const Icon = config.icon;
  const progress = Math.min((daysElapsed / totalDays) * 100, 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${config.color} text-xs font-medium cursor-help`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>SLA: 45 days from submission</p>
            <p>Due: {sla.toLocaleDateString()}</p>
            <div className="mt-2 w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${daysRemaining <= 3 ? 'bg-red-500' : daysRemaining <= 10 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}