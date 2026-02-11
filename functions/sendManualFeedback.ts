import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !['junior_admin', 'admin_head', 'admin'].includes(user.portal_role || user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { booking_number } = await req.json();
    const appUrl = Deno.env.get('BASE44_APP_URL');

    if (!appUrl) {
      return Response.json({ error: 'BASE44_APP_URL not configured' }, { status: 500 });
    }

    // Fetch bookings
    let bookings;
    if (booking_number) {
      bookings = await base44.asServiceRole.entities.RoomBooking.filter({ 
        booking_number,
        status: { $in: ['approved', 'completed'] }
      });
    } else {
      bookings = await base44.asServiceRole.entities.RoomBooking.filter({ 
        status: { $in: ['approved', 'completed'] }
      });
    }

    // Check which bookings already have feedback emails sent
    const existingFeedback = await base44.asServiceRole.entities.RoomFeedback.filter({
      feedback_email_sent: true
    });
    const sentBookingIds = new Set(existingFeedback.map(f => f.booking_id));

    const results = [];

    for (const booking of bookings) {
      // Skip if feedback already sent
      if (sentBookingIds.has(booking.id)) {
        results.push({ booking_number: booking.booking_number, status: 'already_sent' });
        continue;
      }

      const feedbackBaseUrl = `${appUrl}/SubmitFeedback?bookingId=${booking.id}`;

      // Send to organizer
      const organizerUrl = `${feedbackBaseUrl}&type=organizer`;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: booking.employee_email,
        subject: `Feedback Request - ${booking.meeting_title}`,
        body: `
          <h2>How was your meeting?</h2>
          <p>Dear ${booking.employee_name},</p>
          <p>Your meeting "<strong>${booking.meeting_title}</strong>" in <strong>${booking.room_name}</strong> has concluded.</p>
          <p>We'd love to hear your feedback about the conference room experience.</p>
          <p><a href="${organizerUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Share Your Feedback</a></p>
          <p>Meeting Details:<br>
          Room: ${booking.room_name}<br>
          Date: ${booking.booking_date}<br>
          Time: ${booking.start_time} - ${booking.end_time}</p>
        `
      });

      // Send to attendees
      if (booking.attendees_list && booking.attendees_list.length > 0) {
        for (const attendee of booking.attendees_list) {
          if (attendee.email) {
            const attendeeUrl = `${feedbackBaseUrl}&type=participant&email=${encodeURIComponent(attendee.email)}&name=${encodeURIComponent(attendee.name)}`;
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: attendee.email,
              subject: `Feedback Request - ${booking.meeting_title}`,
              body: `
                <h2>How was the meeting?</h2>
                <p>Dear ${attendee.name},</p>
                <p>You attended the meeting "<strong>${booking.meeting_title}</strong>" in <strong>${booking.room_name}</strong>.</p>
                <p>We'd appreciate your feedback about the conference room experience.</p>
                <p><a href="${attendeeUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Share Your Feedback</a></p>
                <p>Meeting Details:<br>
                Room: ${booking.room_name}<br>
                Date: ${booking.booking_date}<br>
                Time: ${booking.start_time} - ${booking.end_time}</p>
              `
            });
          }
        }
      }

      // Mark as sent
      await base44.asServiceRole.entities.RoomFeedback.create({
        booking_id: booking.id,
        booking_number: booking.booking_number,
        room_id: booking.room_id,
        room_name: booking.room_name,
        meeting_title: booking.meeting_title,
        booking_date: booking.booking_date,
        respondent_email: booking.employee_email,
        respondent_name: booking.employee_name,
        respondent_type: 'organizer',
        feedback_email_sent: true,
        feedback_email_sent_at: new Date().toISOString()
      });

      results.push({ booking_number: booking.booking_number, status: 'sent' });
    }

    return Response.json({ 
      message: 'Feedback emails sent',
      results,
      total: results.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});