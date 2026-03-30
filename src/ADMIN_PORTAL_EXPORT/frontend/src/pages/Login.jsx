// ============================================================================
// LOGIN PAGE
// ============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [email, setEmail] = useState('admin@portal.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Admin Portal
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Independent Full-Stack System
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@portal.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin123"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded text-sm text-gray-600 space-y-2">
            <p className="font-medium">Test Credentials:</p>
            <p>admin@portal.com (Super Admin)</p>
            <p>employee@portal.com (Employee)</p>
            <p>manager@portal.com (Manager)</p>
            <p>finance@portal.com (Finance)</p>
            <p className="text-xs text-gray-500">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};