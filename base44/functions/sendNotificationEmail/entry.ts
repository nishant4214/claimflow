import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Inline template renderer to avoid module imports
function renderTemplate(template, data) {
  if (!template) return { subject: '', body: '' };
  const subject = replacePlaceholders(template.subject || '', data);
  const body = replacePlaceholders(template.body || '', data);
  return { subject, body };
}

function replacePlaceholders(text, data) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
    const trimmed = placeholder.trim();
    if (trimmed.includes('?')) {
      return evaluateExpression(trimmed, data);
    }
    const value = getNestedValue(data, trimmed);
    return value !== undefined && value !== null ? String(value) : '';
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

function evaluateExpression(expr, data) {
  try {
    let evaluableExpr = expr;
    const placeholderMatches = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
    if (placeholderMatches) {
      const uniquePlaceholders = [...new Set(placeholderMatches)];
      uniquePlaceholders.forEach(placeholder => {
        const value = getNestedValue(data, placeholder);
        if (typeof value === 'string') {
          evaluableExpr = evaluableExpr.replace(new RegExp(`\\b${placeholder}\\b`, 'g'), `"${value.replace(/"/g, '\\"')}"`);
        } else {
          evaluableExpr = evaluableExpr.replace(new RegExp(`\\b${placeholder}\\b`, 'g'), JSON.stringify(value));
        }
      });
    }
    const result = Function(`"use strict"; return (${evaluableExpr})`)();
    return result ? result : '';
  } catch (e) {
    console.error('Template expression evaluation failed:', e.message);
    return '';
  }
}

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

    // Build event type key
    const eventTypeMap = {
      'CLAIM': { approved: 'CLAIM_APPROVED', rejected: 'CLAIM_REJECTED', sent_back: 'CLAIM_SENT_BACK' },
      'ROOM_BOOKING': { approved: 'ROOM_APPROVED', rejected: 'ROOM_REJECTED', sent_back: 'ROOM_SENT_BACK' },
      'TRANSPORT_REQUEST': { approved: 'TRANSPORT_APPROVED', rejected: 'TRANSPORT_REJECTED', sent_back: 'TRANSPORT_SENT_BACK' }
    };
    const eventType = eventTypeMap[module]?.[status] || `${module}_${status}`;

    // Determine recipient
    const recipient = data.employee_email || data.respondent_email;
    if (!recipient) {
      return Response.json({ error: 'Recipient email not found' }, { status: 400 });
    }

    // Prepare data for template rendering
    const templateData = {
      employeeName: data.employee_name,
      requestId: data.claim_number || data.booking_number || data.tar_number || requestId,
      status: status.charAt(0).toUpperCase() + status.slice(1),
      remarks: remarks || 'N/A',
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      module: module,
      // Claims specific
      head: data.head || 'N/A',
      subHead: data.sub_head || '',
      amount: data.amount || 'N/A',
      // Room booking specific
      roomName: data.room_name || 'N/A',
      bookingDate: data.booking_date || 'N/A',
      timeSlot: data.start_time && data.end_time ? `${data.start_time} - ${data.end_time}` : 'N/A',
      // Transport specific
      pickup: data.pickup_location || 'N/A',
      drop: data.drop_location || 'N/A',
      travelDate: data.effective_date || 'N/A'
    };

    // Fetch template (with fallback to defaults in getEmailTemplate)
    let emailSubject = '';
    let emailBody = '';

    try {
      const templateResponse = await base44.functions.invoke('getEmailTemplate', { eventType });
      if (templateResponse.template) {
        const rendered = renderTemplate(templateResponse.template, templateData);
        emailSubject = rendered.subject;
        emailBody = rendered.body;
      }
    } catch (templateError) {
      console.error('Template fetch failed:', templateError.message);
      // If template system fails, use generic fallback
      emailSubject = `${module.replace(/_/g, ' ')} ${status.toUpperCase()} – ${templateData.requestId}`;
      emailBody = `Dear ${templateData.employeeName},\n\nYour request has been ${status}.\n\nRequest ID: ${templateData.requestId}\nStatus: ${templateData.status}\nDate: ${templateData.date}\n\nBest regards,\nAdmin Portal Team`;
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
        claim_id: module === 'CLAIM' ? requestId : undefined,
        claim_number: module === 'CLAIM' ? (data.claim_number || requestId) : undefined,
        booking_id: module === 'ROOM_BOOKING' ? requestId : undefined,
        booking_number: module === 'ROOM_BOOKING' ? (data.booking_number || requestId) : undefined,
        notification_type: eventType,
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

// Fallback functions kept for emergency use only