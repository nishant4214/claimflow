import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'blue',
  delay = 0
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-emerald-50',
    purple: 'bg-purple-50',
    amber: 'bg-amber-50',
    red: 'bg-red-50',
    cyan: 'bg-cyan-50',
    pink: 'bg-pink-50',
    indigo: 'bg-indigo-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            <div className={`w-2 bg-gradient-to-b ${colorClasses[color]}`} />
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  
                  {trend && trendValue && (
                    <div className={`flex items-center gap-1 mt-2 text-sm ${
                      trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend === 'up' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span>{trendValue}</span>
                    </div>
                  )}
                </div>
                
                <div className={`p-3 rounded-xl ${bgColorClasses[color]}`}>
                  <Icon className={`w-6 h-6 bg-gradient-to-br ${colorClasses[color]} bg-clip-text text-transparent`} 
                    style={{ 
                      color: color === 'blue' ? '#3b82f6' : 
                             color === 'green' ? '#10b981' :
                             color === 'purple' ? '#8b5cf6' :
                             color === 'amber' ? '#f59e0b' :
                             color === 'red' ? '#ef4444' :
                             color === 'cyan' ? '#06b6d4' :
                             color === 'pink' ? '#ec4899' :
                             '#6366f1'
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}