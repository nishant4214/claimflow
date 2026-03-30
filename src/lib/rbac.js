// ─── CENTRALIZED RBAC CONFIGURATION ─────────────────────────────────────────
// Single source of truth for all role-based access control

export const ALL_ROLES = [
  'employee', 'junior_admin', 'manager', 'admin_head',
  'functional_lead', 'cro', 'cfo', 'finance', 'admin', 'super_admin'
];

export const ROLE_LABELS = {
  employee: 'Employee',
  junior_admin: 'Junior Admin',
  manager: 'Manager',
  admin_head: 'Admin Head',
  functional_lead: 'Functional Lead',
  cro: 'CRO',
  cfo: 'CFO',
  finance: 'Finance',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

// ─── ROUTE PERMISSIONS ────────────────────────────────────────────────────────
// '*' = all routes allowed
export const ROLE_PERMISSIONS = {
  employee: {
    routes: ['Dashboard', 'MyClaims', 'NewClaim', 'ConferenceRooms', 'TransportAccess', 'Notifications', 'MyAccount'],
    actions: ['claim:create', 'claim:view_own', 'booking:create'],
  },
  junior_admin: {
    routes: ['Dashboard', 'Approvals', 'MyClaims', 'ConferenceRooms', 'RoomFeedbackDashboard', 'HousekeepingDashboard', 'Notifications', 'MyAccount'],
    actions: ['claim:verify', 'claim:view_own', 'booking:approve'],
  },
  manager: {
    routes: ['Dashboard', 'Approvals', 'MyClaims', 'ConferenceRooms', 'TransportAccess', 'Notifications', 'MyAccount'],
    actions: ['claim:approve_manager', 'claim:view_own'],
  },
  admin_head: {
    routes: ['Dashboard', 'Approvals', 'MyClaims', 'ConferenceRooms', 'TransportAccess', 'RoomFeedbackDashboard', 'AdminRooms', 'BulkUpload', 'AdminCategories', 'WorkflowConfig', 'Reports', 'Notifications', 'MyAccount'],
    actions: ['claim:approve_admin', 'claim:view_all', 'category:manage', 'workflow:manage'],
  },
  functional_lead: {
    routes: ['Dashboard', 'Approvals', 'TransportAccess', 'Notifications', 'MyAccount'],
    actions: ['claim:approve_lead'],
  },
  cro: {
    routes: ['Dashboard', 'Approvals', 'MyClaims', 'ConferenceRooms', 'BulkUpload', 'Notifications', 'MyAccount'],
    actions: ['claim:approve_cro', 'claim:view_own'],
  },
  cfo: {
    routes: ['Dashboard', 'Approvals', 'ConferenceRooms', 'Reports', 'Notifications', 'MyAccount'],
    actions: ['claim:approve_cfo', 'claim:view_all'],
  },
  finance: {
    routes: ['Dashboard', 'Finance', 'ConferenceRooms', 'Reports', 'Notifications', 'MyAccount'],
    actions: ['claim:process_payment', 'claim:view_all'],
  },
  admin: {
    routes: ['Dashboard', 'TestCredentials', 'Approvals', 'Finance', 'ConferenceRooms', 'TransportAccess', 'RoomFeedbackDashboard', 'HousekeepingDashboard', 'AdminRooms', 'BulkUpload', 'AdminCategories', 'WorkflowConfig', 'Reports', 'UserManagement', 'Notifications', 'MyAccount'],
    actions: ['*'],
  },
  super_admin: {
    routes: ['*'],
    actions: ['*'],
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function hasRouteAccess(role, routeName) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.employee;
  if (perms.routes.includes('*')) return true;
  return perms.routes.includes(routeName);
}

export function hasAction(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.employee;
  if (perms.actions.includes('*')) return true;
  return perms.actions.includes(action);
}

export function isSuperAdmin(role) {
  return role === 'super_admin';
}

export function canManageUsers(role) {
  return ['admin', 'super_admin'].includes(role);
}

export function canSwitchRoles(role) {
  return role === 'super_admin';
}

// ─── ROLE SWITCH STORAGE ─────────────────────────────────────────────────────
const ROLE_SWITCH_KEY = 'super_admin_view_as';

export function getViewAsRole() {
  return localStorage.getItem(ROLE_SWITCH_KEY) || null;
}

export function setViewAsRole(role) {
  if (role) localStorage.setItem(ROLE_SWITCH_KEY, role);
  else localStorage.removeItem(ROLE_SWITCH_KEY);
}

// Returns the effective UI role (super_admin can impersonate for UI only)
export function getEffectiveUIRole(actualRole) {
  if (actualRole !== 'super_admin') return actualRole;
  const viewAs = getViewAsRole();
  return viewAs || 'super_admin';
}