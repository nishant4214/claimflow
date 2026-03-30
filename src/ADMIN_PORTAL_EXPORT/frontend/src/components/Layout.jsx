// ============================================================================
// LAYOUT - MAIN APPLICATION LAYOUT
// ============================================================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem label="Dashboard" onClick={() => navigate('/dashboard')} />
          {user?.portal_role === 'employee' && (
            <NavItem label="Submit Claim" onClick={() => navigate('/claims/new')} />
          )}
          <NavItem label="My Claims" onClick={() => navigate('/claims')} />
          
          {['manager', 'admin_head', 'super_admin'].includes(user?.portal_role) && (
            <NavItem label="Approvals" onClick={() => navigate('/approvals')} />
          )}

          {['admin_head', 'super_admin'].includes(user?.portal_role) && (
            <>
              <NavItem label="Users" onClick={() => navigate('/users')} />
              <NavItem label="Settings" onClick={() => navigate('/settings')} />
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-gray-50">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="text-xs text-gray-500">{user?.portal_role}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <p className="text-sm text-gray-600">Logged in as {user?.email}</p>
        </header>
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition"
  >
    {label}
  </button>
);