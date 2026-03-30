// ============================================================================
// CLAIMS PAGE
// ============================================================================

import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { claimsAPI } from '../services/api';

export const Claims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await claimsAPI.getAll();
      setClaims(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch claims');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Claims</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading claims...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No claims found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Claim Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {claim.claim_number || `CLM-${claim.id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {claim.employee_email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      ₹{claim.amount?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    verified: 'bg-cyan-100 text-cyan-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    paid: 'bg-purple-100 text-purple-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {status || 'Unknown'}
    </span>
  );
};