// ============================================================================
// USERS PAGE - ADMIN ONLY
// ============================================================================

import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { usersAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        usersAPI.getAll(),
        usersAPI.getRoles()
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditName(u.full_name);
    setEditRole(u.portal_role);
  };

  const handleSave = async () => {
    try {
      await usersAPI.updateRole(editingUser.id, editRole, editName);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  if (!['admin_head', 'super_admin'].includes(user?.portal_role)) {
    return (
      <Layout>
        <div className="text-red-600">Access denied. Admin access required.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Users</h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {u.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.department || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {u.portal_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Dialog */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Edit User</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.name} value={role.name}>
                        {role.display_label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};