import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for system operations
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Find bookings that ended 5 minutes ago and are approved/completed
    const allBookings = await base44.asServiceRole.entities.RoomBooking.list();
    
    const eligibleBookings = allBookings.filter(booking => {
      if (!['approved', 'completed'].includes(booking.status)) return false;
      
      // Parse booking end time
      const [hours, minutes] = booking.end_time.split(':').map(Number);
      const bookingEndTime = new Date(booking.booking_date);
      bookingEndTime.setHours(hours, minutes, 0, 0);
      
      // Check if ended between 5-30 minutes ago (wider window to ensure no bookings are missed)
      const timeSinceEnd = now - bookingEndTime;
      const fiveMinutes = 5 * 60 * 1000;
      const thirtyMinutes = 30 * 60 * 1000;
      
      return timeSinceEnd >= fiveMinutes && timeSinceEnd <= thirtyMinutes;
    });

    if (eligibleBookings.length === 0) {
      return Response.json({ 
        message: 'No eligible bookings found',
        checked: allBookings.length 
      });
    }

    const results = [];
    
    for (const booking of eligibleBookings) {
      // Check if feedback email already sent
      const existingMarker = await base44.asServiceRole.entities.RoomFeedback.filter({
        booking_id: booking.id,
        feedback_email_sent: true
      });
      
      if (existingMarker.length > 0) {
        continue;
      }
      
      const appUrl = Deno.env.get('BASE44_APP_URL') || 'https://your-app-url.base44.com';
      const feedbackUrl = `${appUrl}/SubmitFeedback?bookingId=${booking.id}`;
      
      // Send email to organizer
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: booking.employee_email,
          subject: `Feedback Request: ${booking.meeting_title}`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Conference Room Feedback Request</h2>
              
              <p>Dear ${booking.employee_name},</p>
              
              <p>Thank you for using our conference room facilities. We would appreciate your feedback on your recent meeting:</p>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Meeting:</strong> ${booking.meeting_title}</p>
                <p style="margin: 5px 0;"><strong>Room:</strong> ${booking.room_name}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${booking.booking_date}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
              </div>
              
              <p>Your feedback helps us improve our facilities and services. Please take a moment to share your experience:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${feedbackUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Submit Feedback
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">Note: This feedback link will expire 48 hours after your meeting ended.</p>
              
              <p>Thank you for your time!</p>
            </div>
          `
        });
        
        results.push({ email: booking.employee_email, status: 'sent' });
      } catch (error) {
        results.push({ email: booking.employee_email, status: 'failed', error: error.message });
      }
      
      // Send emails to participants
      if (booking.attendees_list && booking.attendees_list.length > 0) {
        for (const attendee of booking.attendees_list) {
          if (!attendee.email) continue;
          
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: attendee.email,
              subject: `Feedback Request: ${booking.meeting_title}`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Conference Room Feedback Request</h2>
                  
                  <p>Dear ${attendee.name},</p>
                  
                  <p>Thank you for attending the meeting in our conference room. We would appreciate your feedback on the facilities:</p>
                  
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Meeting:</strong> ${booking.meeting_title}</p>
                    <p style="margin: 5px 0;"><strong>Room:</strong> ${booking.room_name}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${booking.booking_date}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
                  </div>
                  
                  <p>Your feedback helps us improve our conference room experience. Please take a moment to share your thoughts:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${feedbackUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Submit Feedback
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px;">Note: This feedback link will expire 48 hours after the meeting ended.</p>
                  
                  <p>Thank you for your time!</p>
                </div>
              `
            });
            
            results.push({ email: attendee.email, status: 'sent' });
          } catch (error) {
            results.push({ email: attendee.email, status: 'failed', error: error.message });
          }
        }
      }
      
      // Mark as email sent by creating a marker record
      await base44.asServiceRole.entities.RoomFeedback.create({
        booking_id: booking.id,
        booking_number: booking.booking_number,
        room_id: booking.room_id,
        room_name: booking.room_name,
        meeting_title: booking.meeting_title,
        booking_date: booking.booking_date,
        respondent_email: 'system',
        respondent_name: 'System Marker',
        respondent_type: 'organizer',
        overall_rating: 0,
        room_quality_rating: 0,
        equipment_rating: 0,
        cleanliness_rating: 0,
        feedback_email_sent: true,
        feedback_email_sent_at: now.toISOString()
      });
    }

    return Response.json({
      success: true,
      processed: eligibleBookings.length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});