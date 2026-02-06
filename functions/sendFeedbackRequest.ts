import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FEEDBACK_DELAY_MINUTES = 15;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || !['junior_admin', 'admin_head', 'admin'].includes(user.portal_role || user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return Response.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get booking details
    const bookings = await base44.asServiceRole.entities.RoomBooking.filter({ id: booking_id });
    if (bookings.length === 0) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookings[0];

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return Response.json({ error: 'Booking must be completed' }, { status: 400 });
    }

    // Get attendee list
    const attendees = booking.attendees_list || [];
    
    // Add organizer to attendee list if not already included
    const allAttendees = [...attendees];
    if (!allAttendees.find(a => a.email === booking.employee_email)) {
      allAttendees.push({
        name: booking.employee_name,
        email: booking.employee_email
      });
    }

    const feedbackLink = `${Deno.env.get('BASE44_APP_URL') || 'https://your-app.base44.app'}/RoomFeedback?bookingId=${booking.id}`;

    // Send feedback request to all attendees
    const emailPromises = allAttendees.map(async (attendee) => {
      // Check if feedback already exists
      const existingFeedback = await base44.asServiceRole.entities.ConferenceFeedback.filter({
        booking_id: booking.id,
        attendee_id: attendee.email
      });

      if (existingFeedback.length > 0) {
        return { email: attendee.email, status: 'already_submitted' };
      }

      // Send email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: attendee.email,
        subject: `Feedback Request: ${booking.room_name} Meeting`,
        body: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Conference Room Feedback Request</h2>
                
                <p>Dear ${attendee.name},</p>
                
                <p>We hope your recent meeting was productive! We would appreciate your feedback on the conference room experience.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Room:</strong> ${booking.room_name}</p>
                  <p style="margin: 5px 0;"><strong>Meeting:</strong> ${booking.meeting_title}</p>
                  <p style="margin: 5px 0;"><strong>Date:</strong> ${booking.booking_date}</p>
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                </div>
                
                <p>Your feedback helps us improve our facilities and services. The survey takes only 2-3 minutes to complete.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${feedbackLink}" 
                     style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Submit Feedback
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  If you have any questions, please contact our facilities team.
                </p>
                
                <p>Thank you for your time!</p>
                
                <p style="margin-top: 20px;">
                  Best regards,<br>
                  Facilities Team
                </p>
              </div>
            </body>
          </html>
        `
      });

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: attendee.email,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        notification_type: 'meeting_feedback_request',
        title: 'Conference Room Feedback Request',
        message: `Please provide feedback for your meeting in ${booking.room_name}`,
        is_read: false,
        email_sent: true
      });

      return { email: attendee.email, status: 'sent' };
    });

    const results = await Promise.all(emailPromises);

    return Response.json({
      success: true,
      booking_id: booking.id,
      room_name: booking.room_name,
      total_attendees: allAttendees.length,
      results
    });

  } catch (error) {
    console.error('Error sending feedback requests:', error);
    return Response.json({ 
      error: 'Failed to send feedback requests',
      details: error.message 
    }, { status: 500 });
  }
});