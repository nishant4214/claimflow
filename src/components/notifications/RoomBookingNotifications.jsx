import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

/**
 * Room Booking Notification Helper
 * Handles all notification creation for conference room booking lifecycle events
 */

// Notification types for room bookings
export const ROOM_NOTIFICATION_TYPES = {
  BOOKING_SUBMITTED: 'booking_submitted',
  BOOKING_APPROVAL_REQUIRED: 'booking_approval_required',
  BOOKING_APPROVED: 'booking_approved',
  BOOKING_REJECTED: 'booking_rejected',
  BOOKING_CANCELLED: 'booking_cancelled',
  MEETING_REMINDER: 'meeting_reminder',
  HOUSEKEEPING_TASK_ASSIGNED: 'housekeeping_task_assigned',
  HOUSEKEEPING_TASK_UPDATED: 'housekeeping_task_updated',
  HOUSEKEEPING_TASK_COMPLETED: 'housekeeping_task_completed',
  MEETING_FEEDBACK_REQUEST: 'meeting_feedback_request',
};

/**
 * Create in-app notification
 */
const createInAppNotification = async (recipient_email, notification_type, title, message, booking_id, booking_number) => {
  try {
    await base44.entities.Notification.create({
      recipient_email,
      notification_type,
      title,
      message,
      booking_id,
      booking_number,
      is_read: false,
      email_sent: false,
    });
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
  }
};

/**
 * Send email notification
 */
const sendEmailNotification = async (to, subject, body) => {
  try {
    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body,
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
};

/**
 * Send SMS notification (for housekeeping events only)
 */
const sendSMSNotification = async (phone, message) => {
  // SMS integration would go here
  // For now, we'll log it as this requires SMS provider setup
  console.log(`SMS to ${phone}: ${message}`);
  // await base44.integrations.SMS.Send({ to: phone, message });
};

/**
 * Notify employee about booking submission
 */
export const notifyBookingSubmitted = async (booking, user) => {
  const title = 'Booking Request Submitted';
  const message = `Your conference room booking request for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'PPP')} at ${booking.start_time} has been submitted and is pending approval.`;

  // In-app notification
  await createInAppNotification(
    booking.employee_email,
    ROOM_NOTIFICATION_TYPES.BOOKING_SUBMITTED,
    title,
    message,
    booking.id,
    booking.booking_number
  );

  // Email notification
  const emailBody = `
    <h2>${title}</h2>
    <p>Dear ${booking.employee_name},</p>
    <p>${message}</p>
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.booking_number}</li>
      <li><strong>Room:</strong> ${booking.room_name}</li>
      <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
      <li><strong>Meeting Title:</strong> ${booking.meeting_title}</li>
      <li><strong>Attendees:</strong> ${booking.attendees_count}</li>
    </ul>
    <p>You will be notified once your booking is reviewed.</p>
  `;

  await sendEmailNotification(booking.employee_email, title, emailBody);
};

/**
 * Notify approvers about pending booking
 */
export const notifyApprovalRequired = async (booking) => {
  const title = 'Conference Room Booking Approval Required';
  const message = `${booking.employee_name} has requested approval for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'PPP')} at ${booking.start_time}.`;

  // Get all users who can approve (junior_admin, admin_head, admin)
  try {
    const allUsers = await base44.entities.User.list();
    const approvers = allUsers.filter(u => 
      ['junior_admin', 'admin_head', 'admin'].includes(u.portal_role || u.role)
    );

    for (const approver of approvers) {
      // In-app notification
      await createInAppNotification(
        approver.email,
        ROOM_NOTIFICATION_TYPES.BOOKING_APPROVAL_REQUIRED,
        title,
        message,
        booking.id,
        booking.booking_number
      );

      // Email notification
      const emailBody = `
        <h2>${title}</h2>
        <p>Dear ${approver.full_name},</p>
        <p>${message}</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Booking Number:</strong> ${booking.booking_number}</li>
          <li><strong>Requested By:</strong> ${booking.employee_name} (${booking.department})</li>
          <li><strong>Room:</strong> ${booking.room_name}</li>
          <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
          <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
          <li><strong>Meeting Title:</strong> ${booking.meeting_title}</li>
          <li><strong>Purpose:</strong> ${booking.purpose || 'N/A'}</li>
        </ul>
        <p>Please review and approve/reject this booking request.</p>
      `;

      await sendEmailNotification(approver.email, title, emailBody);
    }
  } catch (error) {
    console.error('Failed to notify approvers:', error);
  }
};

/**
 * Notify employee about booking approval
 */
export const notifyBookingApproved = async (booking) => {
  const title = 'Conference Room Booking Approved';
  const message = `Your booking for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'PPP')} at ${booking.start_time} has been approved.`;

  // In-app notification
  await createInAppNotification(
    booking.employee_email,
    ROOM_NOTIFICATION_TYPES.BOOKING_APPROVED,
    title,
    message,
    booking.id,
    booking.booking_number
  );

  // Email notification
  const emailBody = `
    <h2>${title}</h2>
    <p>Dear ${booking.employee_name},</p>
    <p>${message}</p>
    <h3>Confirmed Booking Details:</h3>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.booking_number}</li>
      <li><strong>Room:</strong> ${booking.room_name}</li>
      <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
      <li><strong>Meeting Title:</strong> ${booking.meeting_title}</li>
    </ul>
    ${booking.pre_setup_required ? '<p><strong>Note:</strong> Pre-meeting setup has been scheduled.</p>' : ''}
    ${booking.post_cleanup_required ? '<p><strong>Note:</strong> Post-meeting cleanup has been scheduled.</p>' : ''}
    <p>See you at the meeting!</p>
  `;

  await sendEmailNotification(booking.employee_email, title, emailBody);

  // SMS notification if housekeeping is required
  if (booking.pre_setup_required || booking.post_cleanup_required) {
    const setupInfo = booking.pre_setup_required ? `pre-meeting setup (${booking.pre_setup_minutes} min before)` : '';
    const cleanupInfo = booking.post_cleanup_required ? `post-meeting cleanup (${booking.post_cleanup_minutes} min after)` : '';
    const housekeepingInfo = [setupInfo, cleanupInfo].filter(Boolean).join(' and ');
    
    const smsMessage = `Booking ${booking.booking_number} approved. ${housekeepingInfo} scheduled for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'MMM dd')} at ${booking.start_time}.`;
    
    // Send SMS (would need phone number from user profile)
    await sendSMSNotification(booking.employee_email, smsMessage);
  }
};

/**
 * Notify housekeeping about new task
 */
export const notifyHousekeepingTask = async (booking) => {
  if (!booking.pre_setup_required && !booking.post_cleanup_required) {
    return;
  }

  const title = 'New Housekeeping Task Assigned';
  const message = `Setup/cleanup required for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'PPP')} at ${booking.start_time}.`;

  try {
    // Get all housekeeping staff and admins
    const allUsers = await base44.entities.User.list();
    const housekeepingStaff = allUsers.filter(u => 
      ['junior_admin', 'admin_head', 'admin'].includes(u.portal_role || u.role)
    );

    for (const staff of housekeepingStaff) {
      await createInAppNotification(
        staff.email,
        ROOM_NOTIFICATION_TYPES.HOUSEKEEPING_TASK_ASSIGNED,
        title,
        message,
        booking.id,
        booking.booking_number
      );
    }
  } catch (error) {
    console.error('Failed to notify housekeeping:', error);
  }
};

/**
 * Notify employee about booking rejection
 */
export const notifyBookingRejected = async (booking) => {
  const title = 'Conference Room Booking Rejected';
  const message = `Your booking request for ${booking.room_name} on ${format(parseISO(booking.booking_date), 'PPP')} has been rejected.`;

  // In-app notification
  await createInAppNotification(
    booking.employee_email,
    ROOM_NOTIFICATION_TYPES.BOOKING_REJECTED,
    title,
    message,
    booking.id,
    booking.booking_number
  );

  // Email notification with rejection reason
  const emailBody = `
    <h2>${title}</h2>
    <p>Dear ${booking.employee_name},</p>
    <p>${message}</p>
    <h3>Booking Details:</h3>
    <ul>
      <li><strong>Booking Number:</strong> ${booking.booking_number}</li>
      <li><strong>Room:</strong> ${booking.room_name}</li>
      <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
    </ul>
    ${booking.rejection_reason ? `<p><strong>Reason:</strong> ${booking.rejection_reason}</p>` : ''}
    <p><strong>Suggestion:</strong> Please check room availability and try booking for a different time slot or room.</p>
    <p>If you need assistance, please contact the admin team.</p>
  `;

  await sendEmailNotification(booking.employee_email, title, emailBody);
};

/**
 * Send meeting reminder
 */
export const sendMeetingReminder = async (booking, hoursBeforeMeeting) => {
  const title = `Meeting Reminder: ${hoursBeforeMeeting}h`;
  const message = `Reminder: Your meeting in ${booking.room_name} is scheduled for ${format(parseISO(booking.booking_date), 'PPP')} at ${booking.start_time}.`;

  // In-app notification
  await createInAppNotification(
    booking.employee_email,
    ROOM_NOTIFICATION_TYPES.MEETING_REMINDER,
    title,
    message,
    booking.id,
    booking.booking_number
  );

  // Email notification
  const emailBody = `
    <h2>${title}</h2>
    <p>Dear ${booking.employee_name},</p>
    <p>${message}</p>
    <h3>Meeting Details:</h3>
    <ul>
      <li><strong>Room:</strong> ${booking.room_name}</li>
      <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
      <li><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</li>
      <li><strong>Meeting Title:</strong> ${booking.meeting_title}</li>
      <li><strong>Attendees:</strong> ${booking.attendees_count}</li>
    </ul>
    <p>Don't forget to prepare for your meeting!</p>
  `;

  await sendEmailNotification(booking.employee_email, title, emailBody);
};

/**
 * Request post-meeting feedback
 */
export const requestMeetingFeedback = async (booking) => {
  const title = 'Meeting Feedback Request';
  const message = `How was your meeting in ${booking.room_name}? We'd love to hear your feedback.`;

  // In-app notification
  await createInAppNotification(
    booking.employee_email,
    ROOM_NOTIFICATION_TYPES.MEETING_FEEDBACK_REQUEST,
    title,
    message,
    booking.id,
    booking.booking_number
  );

  // Email notification
  const emailBody = `
    <h2>${title}</h2>
    <p>Dear ${booking.employee_name},</p>
    <p>Thank you for using ${booking.room_name} for your meeting on ${format(parseISO(booking.booking_date), 'PPP')}.</p>
    <p>We'd appreciate your feedback to help us improve our conference room facilities.</p>
    <h3>Meeting Details:</h3>
    <ul>
      <li><strong>Room:</strong> ${booking.room_name}</li>
      <li><strong>Date:</strong> ${format(parseISO(booking.booking_date), 'PPP')}</li>
      <li><strong>Meeting Title:</strong> ${booking.meeting_title}</li>
    </ul>
    <p>Please share your experience with us.</p>
  `;

  await sendEmailNotification(booking.employee_email, title, emailBody);
};