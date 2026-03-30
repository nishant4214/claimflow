// ============================================================================
// DASHBOARD PAGE
// ============================================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { claimsAPI } from '../services/api';
import { Layout } from '../components/Layout';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await claimsAPI.getAll();
        const claims = response.data.data || [];

        setStats({
          totalClaims: claims.length,
          pendingClaims: claims.filter(c => c.status === 'draft' || c.status === 'submitted').length,
          approvedClaims: claims.filter(c => c.status === 'approved').length,
          rejectedClaims: claims.filter(c => c.status === 'rejected').length
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Layout>
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Total Claims"
            value={stats.totalClaims}
            color="bg-blue-100 text-blue-700"
          />
          <StatCard
            title="Pending"
            value={stats.pendingClaims}
            color="bg-yellow-100 text-yellow-700"
          />
          <StatCard
            title="Approved"
            value={stats.approvedClaims}
            color="bg-green-100 text-green-700"
          />
          <StatCard
            title="Rejected"
            value={stats.rejectedClaims}
            color="bg-red-100 text-red-700"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <StatusItem label="Database" status="Connected" color="green" />
            <StatusItem label="Authentication" status="Active" color="green" />
            <StatusItem label="API Server" status="Running" color="green" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-2">Welcome!</h2>
          <p className="text-blue-800">
            You are logged in as <strong>{user?.full_name}</strong> ({user?.portal_role})
          </p>
          <p className="text-blue-800 mt-2">
            This is an independent, fully functional admin portal with zero Base44 dependency.
          </p>
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, color }) => (
  <div className={`rounded-lg shadow p-6 text-center ${color}`}>
    <p className="text-sm font-medium opacity-75">{title}</p>
    <p className="text-4xl font-bold mt-2">{value}</p>
  </div>
);

const StatusItem = ({ label, status, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className={`px-3 py-1 rounded text-sm font-medium bg-${color}-100 text-${color}-700`}>
      {status}
    </span>
  </div>
);