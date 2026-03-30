import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Default templates (fallback)
const DEFAULT_TEMPLATES = {
  CLAIM_APPROVED: {
    subject: 'Claim Approved – {{requestId}}',
    body: `Dear {{employeeName}},

Your expense claim has been approved.

═══════════════════════════════════════════════════════════

CLAIM DETAILS
─────────────────────────────────────────────────────────
Claim ID: {{requestId}}
Employee: {{employeeName}}
Amount: ₹{{amount}}
Category: {{head}} {{subHead ? '/ ' + subHead : ''}}
Status: {{status}}
Date & Time: {{date}}

═══════════════════════════════════════════════════════════

Your claim has been approved and will be processed for payment shortly.

Best regards,
Admin Portal Team`
  },
  CLAIM_REJECTED: {
    subject: 'Claim Rejected – {{requestId}}',
    body: `Dear {{employeeName}},

Your expense claim has been rejected.

═══════════════════════════════════════════════════════════

CLAIM DETAILS
─────────────────────────────────────────────────────────
Claim ID: {{requestId}}
Employee: {{employeeName}}
Amount: ₹{{amount}}
Category: {{head}} {{subHead ? '/ ' + subHead : ''}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Your claim has been rejected. Please review the remarks above and contact HR if you have any questions.

Best regards,
Admin Portal Team`
  },
  CLAIM_SENT_BACK: {
    subject: 'Claim Sent Back – {{requestId}}',
    body: `Dear {{employeeName}},

Your expense claim has been sent back for corrections.

═══════════════════════════════════════════════════════════

CLAIM DETAILS
─────────────────────────────────────────────────────────
Claim ID: {{requestId}}
Employee: {{employeeName}}
Amount: ₹{{amount}}
Category: {{head}} {{subHead ? '/ ' + subHead : ''}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Please review the remarks and resubmit with necessary changes.

Best regards,
Admin Portal Team`
  },
  ROOM_APPROVED: {
    subject: 'Room Booking Approved – {{requestId}}',
    body: `Dear {{employeeName}},

Your conference room booking has been approved.

═══════════════════════════════════════════════════════════

BOOKING DETAILS
─────────────────────────────────────────────────────────
Booking ID: {{requestId}}
Room: {{roomName}}
Date: {{bookingDate}}
Time: {{timeSlot}}
Status: {{status}}
Date & Time: {{date}}

═══════════════════════════════════════════════════════════

Your room booking has been confirmed. Please ensure all arrangements are in place.

Best regards,
Admin Portal Team`
  },
  ROOM_REJECTED: {
    subject: 'Room Booking Rejected – {{requestId}}',
    body: `Dear {{employeeName}},

Your conference room booking could not be accommodated.

═══════════════════════════════════════════════════════════

BOOKING DETAILS
─────────────────────────────────────────────────────────
Booking ID: {{requestId}}
Room: {{roomName}}
Date: {{bookingDate}}
Time: {{timeSlot}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Please review the remarks and try another date/room.

Best regards,
Admin Portal Team`
  },
  ROOM_SENT_BACK: {
    subject: 'Room Booking Sent Back – {{requestId}}',
    body: `Dear {{employeeName}},

Your conference room booking needs corrections.

═══════════════════════════════════════════════════════════

BOOKING DETAILS
─────────────────────────────────────────────────────────
Booking ID: {{requestId}}
Room: {{roomName}}
Date: {{bookingDate}}
Time: {{timeSlot}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Please review the remarks and resubmit.

Best regards,
Admin Portal Team`
  },
  TRANSPORT_APPROVED: {
    subject: 'Transport Request Approved – {{requestId}}',
    body: `Dear {{employeeName}},

Your OLA/Uber transport request has been approved.

═══════════════════════════════════════════════════════════

REQUEST DETAILS
─────────────────────────────────────────────────────────
Request ID: {{requestId}}
Employee: {{employeeName}}
Status: {{status}}
Date & Time: {{date}}

═══════════════════════════════════════════════════════════

Your transport request has been approved. You can now book OLA/Uber services.

Best regards,
Admin Portal Team`
  },
  TRANSPORT_REJECTED: {
    subject: 'Transport Request Rejected – {{requestId}}',
    body: `Dear {{employeeName}},

Your OLA/Uber transport request has been rejected.

═══════════════════════════════════════════════════════════

REQUEST DETAILS
─────────────────────────────────────────────────────────
Request ID: {{requestId}}
Employee: {{employeeName}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Your request has been rejected. Please contact your manager for details.

Best regards,
Admin Portal Team`
  },
  TRANSPORT_SENT_BACK: {
    subject: 'Transport Request Sent Back – {{requestId}}',
    body: `Dear {{employeeName}},

Your OLA/Uber transport request needs more information.

═══════════════════════════════════════════════════════════

REQUEST DETAILS
─────────────────────────────────────────────────────────
Request ID: {{requestId}}
Employee: {{employeeName}}
Status: {{status}}
Date & Time: {{date}}

REMARKS:
─────────────────────────────────────────────────────────
{{remarks}}

═══════════════════════════════════════════════════════════

Please review the remarks and resubmit.

Best regards,
Admin Portal Team`
  }
};

const PLACEHOLDER_DEFINITIONS = {
  CLAIM_APPROVED: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'date'],
  CLAIM_REJECTED: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'remarks', 'date'],
  CLAIM_SENT_BACK: ['employeeName', 'requestId', 'amount', 'head', 'subHead', 'status', 'remarks', 'date'],
  ROOM_APPROVED: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'date'],
  ROOM_REJECTED: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'remarks', 'date'],
  ROOM_SENT_BACK: ['employeeName', 'requestId', 'roomName', 'bookingDate', 'timeSlot', 'status', 'remarks', 'date'],
  TRANSPORT_APPROVED: ['employeeName', 'requestId', 'status', 'date'],
  TRANSPORT_REJECTED: ['employeeName', 'requestId', 'status', 'remarks', 'date'],
  TRANSPORT_SENT_BACK: ['employeeName', 'requestId', 'status', 'remarks', 'date']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventType } = await req.json();

    if (!eventType) {
      return Response.json({ error: 'Event type is required' }, { status: 400 });
    }

    // Try to fetch custom template
    let template;
    try {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ event_type: eventType });
      if (templates.length > 0 && templates[0].is_active) {
        template = {
          subject: templates[0].subject,
          body: templates[0].body,
          custom: true
        };
      }
    } catch (e) {
      console.log('Custom template not found, using default');
    }

    // Fallback to default template
    if (!template) {
      template = DEFAULT_TEMPLATES[eventType];
      if (!template) {
        return Response.json({ error: 'Template not found for event type: ' + eventType }, { status: 404 });
      }
      template.custom = false;
    }

    const placeholders = PLACEHOLDER_DEFINITIONS[eventType] || [];

    return Response.json({
      success: true,
      template,
      placeholders,
      eventType
    });
  } catch (error) {
    console.error('Get template error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});