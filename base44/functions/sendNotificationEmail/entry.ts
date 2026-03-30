import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { module, requestId, status, data, oldData, changedFields, remarks, approverName, approverRole } = await req.json();

    // Validate required fields
    if (!module || !requestId || !status || !data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate remarks for reject/sent_back
    if ((status === 'rejected' || status === 'sent_back') && !remarks) {
      return Response.json({ error: 'Remarks are mandatory for reject/sent_back' }, { status: 400 });
    }

    // Determine recipient
    const recipient = data.employee_email || data.respondent_email;
    if (!recipient) {
      return Response.json({ error: 'Recipient email not found' }, { status: 400 });
    }

    // Build email based on module
    let emailSubject = '';
    let emailBody = '';

    switch (module) {
      case 'CLAIM':
        const claimId = data.claim_number || requestId;
        emailSubject = `Claim ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Sent Back'} – ${claimId}`;
        emailBody = buildClaimEmail(data, status, remarks, approverName, approverRole);
        break;

      case 'ROOM_BOOKING':
        const bookingId = data.booking_number || requestId;
        emailSubject = `Room Booking ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Sent Back'} – ${bookingId}`;
        emailBody = buildRoomBookingEmail(data, status, remarks, approverName, approverRole);
        break;

      case 'TRANSPORT_REQUEST':
        const tarNumber = data.tar_number || requestId;
        emailSubject = `Transport Request ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Sent Back'} – ${tarNumber}`;
        emailBody = buildTransportEmail(data, status, remarks, approverName, approverRole);
        break;

      default:
        return Response.json({ error: 'Invalid module type' }, { status: 400 });
    }

    // Send email (non-blocking, fail-safe)
    try {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject: emailSubject,
        body: emailBody,
      });
    } catch (emailError) {
      console.error(`Email send failed for ${module} ${requestId}:`, emailError.message);
      // Don't fail the workflow - just log the error
    }

    // Log notification to audit
    try {
      const notificationData = {
        recipient_email: recipient,
        [`${module.toLowerCase()}_id`]: requestId,
        [`${module.toLowerCase()}_number`]: data.claim_number || data.booking_number || data.tar_number,
        notification_type: `${module.toLowerCase()}_${status}`,
        title: emailSubject,
        message: emailBody,
        email_sent: true,
      };

      await base44.asServiceRole.entities.Notification.create(notificationData);
    } catch (logError) {
      console.error(`Audit log failed for ${module} ${requestId}:`, logError.message);
    }

    return Response.json({ 
      success: true, 
      message: `Email sent to ${recipient}`,
      module,
      requestId,
      status 
    });

  } catch (error) {
    console.error('Notification service error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildClaimEmail(data, status, remarks, approverName, approverRole) {
  const statusText = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : 'SENT BACK';
  const actionText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'sent back for corrections';

  return `
Dear ${data.employee_name},

We are writing to inform you that your expense claim has been ${actionText}.

═══════════════════════════════════════════════════════════

CLAIM DETAILS
─────────────────────────────────────────────────────────
Claim ID: ${data.claim_number || 'N/A'}
Employee: ${data.employee_name}
Department: ${data.department}
Amount: ₹${data.amount || 'N/A'}
Category: ${data.head || 'N/A'} ${data.sub_head ? `/ ${data.sub_head}` : ''}

STATUS: ${statusText}
Reviewed By: ${approverName || 'Admin'} (${approverRole || 'N/A'})
Date & Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${remarks ? `
REMARKS:
─────────────────────────────────────────────────────────
${remarks}
` : ''}

═══════════════════════════════════════════════════════════

${status === 'approved' ? 'Your claim has been approved and will be processed for payment shortly.' : status === 'rejected' ? 'Your claim has been rejected. Please review the remarks above and contact HR if you have any questions.' : 'Your claim has been sent back for corrections. Please review the remarks and resubmit with necessary changes.'}

Best regards,
Admin Portal Team
`;
}

function buildRoomBookingEmail(data, status, remarks, approverName, approverRole) {
  const statusText = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : 'SENT BACK';
  const actionText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'sent back for corrections';

  return `
Dear ${data.employee_name},

Your conference room booking has been ${actionText}.

═══════════════════════════════════════════════════════════

BOOKING DETAILS
─────────────────────────────────────────────────────────
Booking ID: ${data.booking_number || 'N/A'}
Room: ${data.room_name}
Date: ${data.booking_date}
Time: ${data.start_time} - ${data.end_time}
Title: ${data.meeting_title}
Attendees: ${data.attendees_count}

STATUS: ${statusText}
Reviewed By: ${approverName || 'Admin'} (${approverRole || 'N/A'})
Date & Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${remarks ? `
REMARKS:
─────────────────────────────────────────────────────────
${remarks}
` : ''}

═══════════════════════════════════════════════════════════

${status === 'approved' ? 'Your room booking has been confirmed. Please ensure all arrangements are in place.' : status === 'rejected' ? 'Your booking could not be accommodated. Please review the remarks and try another date/room.' : 'Your booking needs corrections. Please review the remarks and resubmit.'}

Best regards,
Admin Portal Team
`;
}

function buildTransportEmail(data, status, remarks, approverName, approverRole) {
  const statusText = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : 'SENT BACK';
  const actionText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'sent back for corrections';

  return `
Dear ${data.employee_name},

Your OLA/Uber transport request has been ${actionText}.

═══════════════════════════════════════════════════════════

REQUEST DETAILS
─────────────────────────────────────────────────────────
Request ID: ${data.tar_number || 'N/A'}
Employee: ${data.employee_name}
Department: ${data.department}
Transport Type: ${data.transport_type}
Effective Date: ${data.effective_date}

STATUS: ${statusText}
Reviewed By: ${approverName || 'Admin'} (${approverRole || 'N/A'})
Date & Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

${remarks ? `
REMARKS:
─────────────────────────────────────────────────────────
${remarks}
` : ''}

═══════════════════════════════════════════════════════════

${status === 'approved' ? 'Your transport request has been approved. You can now book OLA/Uber services.' : status === 'rejected' ? 'Your request has been rejected. Please contact your manager for details.' : 'Your request needs more information. Please review the remarks and resubmit.'}

Best regards,
Admin Portal Team
`;
}