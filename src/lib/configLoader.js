import { base44 } from '@/api/base44Client';

/**
 * Configuration Loader with Fallback Pattern
 * If config exists in DB, use it. Otherwise fall back to hardcoded defaults.
 */

// DEFAULT HARDCODED ROLE PERMISSIONS (Fallback)
const DEFAULT_ROLE_PERMISSIONS = {
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
    routes: ['Dashboard', 'Approvals', 'MyClaims', 'ConferenceRooms', 'TransportAccess', 'RoomFeedbackDashboard', 'AdminRooms', 'BulkUpload', 'AdminCategories', 'WorkflowConfig', 'Reports', 'UserManagement', 'RoleAccessManagement', 'Notifications', 'MyAccount'],
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
    routes: ['Dashboard', 'Approvals', 'Finance', 'ConferenceRooms', 'TransportAccess', 'RoomFeedbackDashboard', 'HousekeepingDashboard', 'AdminRooms', 'BulkUpload', 'AdminCategories', 'WorkflowConfig', 'Reports', 'AllUsers', 'RoleAccessManagement', 'UserManagement', 'Notifications', 'MyAccount'],
    actions: ['*'],
  },
};

// DEFAULT WORKFLOW CONFIG (Fallback)
const DEFAULT_NORMAL_WORKFLOW = {
  workflow_type: 'normal',
  workflow_name: 'Normal Reimbursement Workflow',
  stages: [
    { stage_order: 1, stage_name: 'Verification', approver_role: 'junior_admin', status_on_approve: 'verified', is_active: true },
    { stage_order: 2, stage_name: 'Manager Approval', approver_role: 'manager', status_on_approve: 'manager_approved', is_active: true },
    { stage_order: 3, stage_name: 'Admin Head Approval', approver_role: 'admin_head', status_on_approve: 'admin_approved', is_active: true },
  ],
  sla_days: 45,
  sla_warning_days: 3,
  is_active: true,
};

const DEFAULT_SALES_WORKFLOW = {
  workflow_type: 'sales_promotion',
  workflow_name: 'Sales Promotion Workflow',
  stages: [
    { stage_order: 1, stage_name: 'Manager Approval', approver_role: 'manager', status_on_approve: 'manager_approved', is_active: true },
    { stage_order: 2, stage_name: 'CRO Approval', approver_role: 'cro', status_on_approve: 'cro_approved', is_active: true },
    { stage_order: 3, stage_name: 'CFO Approval', approver_role: 'cfo', status_on_approve: 'approved', is_active: true },
  ],
  sla_days: 45,
  sla_warning_days: 3,
  is_active: true,
};

/**
 * Load role permissions from database or use defaults
 */
export async function loadRolePermissions() {
  try {
    const configs = await base44.asServiceRole.entities.RoleConfig.list();
    if (!configs || configs.length === 0) {
      return DEFAULT_ROLE_PERMISSIONS;
    }

    const perms = {};
    configs.forEach(cfg => {
      perms[cfg.role_name] = {
        routes: cfg.accessible_routes || [],
        actions: cfg.allowed_actions || [],
      };
    });

    return perms;
  } catch (error) {
    console.warn('Failed to load RoleConfig from DB, using defaults:', error.message);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

/**
 * Load workflow config from database or use defaults
 */
export async function loadWorkflowConfig(workflowType = 'normal') {
  try {
    const workflows = await base44.entities.WorkflowConfig.filter({ workflow_type: workflowType });
    if (workflows && workflows.length > 0) {
      return workflows[0];
    }
  } catch (error) {
    console.warn(`Failed to load WorkflowConfig (${workflowType}), using defaults:`, error.message);
  }

  return workflowType === 'sales_promotion' ? DEFAULT_SALES_WORKFLOW : DEFAULT_NORMAL_WORKFLOW;
}

/**
 * Load notification config or return undefined (use trigger logic default)
 */
export async function loadNotificationConfig(eventType) {
  try {
    const configs = await base44.entities.NotificationConfig.filter({ event_type: eventType });
    if (configs && configs.length > 0) {
      return configs[0];
    }
  } catch (error) {
    console.warn(`Failed to load NotificationConfig (${eventType}):`, error.message);
  }

  return null;
}

/**
 * Get role labels from config or defaults
 */
export function getRoleLabels(configs) {
  const labels = {};
  configs.forEach(cfg => {
    labels[cfg.role_name] = cfg.display_label;
  });
  return labels;
}

/**
 * Convert loaded workflow config to ROLE_STAGES format for Approvals.jsx
 */
export function convertWorkflowToRoleStages(workflow) {
  const stages = {};

  workflow.stages.forEach(stage => {
    if (stage.is_active) {
      const prevStages = workflow.stages
        .filter(s => s.stage_order < stage.stage_order && s.is_active)
        .map(s => s.status_on_approve);

      stages[stage.approver_role] = {
        statuses: [
          ...prevStages,
          ...(workflow.stages
            .filter(s => s.stage_order <= stage.stage_order && s.is_active)
            .map(s => s.status_on_approve))
        ],
        nextStatus: stage.status_on_approve,
        stage: stage.stage_name,
      };
    }
  });

  return stages;
}

export const DEFAULT_ROLE_PERMISSIONS_EXPORT = DEFAULT_ROLE_PERMISSIONS;
export const DEFAULT_WORKFLOW_EXPORTS = {
  normal: DEFAULT_NORMAL_WORKFLOW,
  sales_promotion: DEFAULT_SALES_WORKFLOW,
};