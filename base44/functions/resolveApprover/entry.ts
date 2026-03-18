/**
 * Backend Function: resolveApprover
 * 
 * Purpose: Resolves the next approver based on hybrid model (portal role + AD manager)
 * 
 * Logic:
 * - Verification stage → Junior Admin (portal_role)
 * - Manager stage → Employee's AD manager (manager_email from AD)
 * - Admin Head stage → Admin Head (portal_role)
 * - CRO stage → CRO (portal_role)
 * - CFO stage → CFO (portal_role)
 * - Finance stage → Finance (portal_role)
 */

export default async function resolveApprover(context) {
  const { claim_id, current_status } = context.data;

  try {
    // Step 1: Fetch claim details
    const claim = await context.base44.entities.Claim.filter({ id: claim_id })[0];
    
    if (!claim) {
      return { success: false, error: "Claim not found" };
    }

    // Step 2: Fetch employee details
    const employee = await context.base44.entities.User.filter({ 
      email: claim.employee_email 
    })[0];

    // Step 3: Resolve approver based on current status
    let approverEmail = null;
    let approverRole = null;
    let nextStatus = null;

    const statusFlowMap = {
      'submitted': {
        // Junior Admin verification
        approverRole: 'junior_admin',
        nextStatus: 'verified'
      },
      'verified': {
        // AD Manager approval
        useADManager: true,
        nextStatus: 'manager_approved'
      },
      'manager_approved': {
        // Admin Head approval
        approverRole: 'admin_head',
        nextStatus: 'admin_approved'
      },
      'admin_approved': {
        // CRO approval
        approverRole: 'cro',
        nextStatus: 'cro_approved'
      },
      'cro_approved': {
        // CFO approval
        approverRole: 'cfo',
        nextStatus: 'cfo_approved'
      },
      'cfo_approved': {
        // Finance processing
        approverRole: 'finance',
        nextStatus: 'paid'
      }
    };

    const flowConfig = statusFlowMap[current_status];

    if (!flowConfig) {
      return { success: false, error: "Invalid status for approval routing" };
    }

    // Check if this stage uses AD manager
    if (flowConfig.useADManager) {
      if (employee?.manager_email) {
        approverEmail = employee.manager_email;
        approverRole = 'manager';
      } else {
        // No manager in AD - skip to next stage
        return resolveApprover(context, {
          ...context.data,
          current_status: flowConfig.nextStatus
        });
      }
    } else {
      // Use portal role
      const approver = await context.base44.entities.User.filter({
        portal_role: flowConfig.approverRole
      })[0];
      
      approverEmail = approver?.email || null;
      approverRole = flowConfig.approverRole;
    }

    // Step 4: Update claim with next approver
    if (approverEmail) {
      await context.base44.entities.Claim.update(claim_id, {
        current_approver_role: approverRole,
        status: current_status
      });

      // Create notification for approver
      await context.base44.entities.Notification.create({
        recipient_email: approverEmail,
        claim_id: claim_id,
        claim_number: claim.claim_number,
        notification_type: 'pending_approval',
        title: 'New Claim Pending Your Approval',
        message: `Claim ${claim.claim_number} from ${claim.employee_name} is pending your approval.`
      });
    }

    return {
      success: true,
      approver_email: approverEmail,
      approver_role: approverRole,
      next_status: flowConfig.nextStatus
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}