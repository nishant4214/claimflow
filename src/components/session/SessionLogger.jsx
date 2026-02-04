import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';

/**
 * Session Logger Component
 * Tracks user session activity for audit and security monitoring
 * This component should be included once in the Layout component
 * 
 * NOTE: Some events (login failure, forced logout, token refresh) require
 * platform-level integration and cannot be tracked from frontend alone
 */

// Generate unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Detect device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'Mobile';
  }
  return 'Web';
};

// Extract browser info
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') > -1) browser = 'Safari';
  else if (ua.indexOf('Edge') > -1) browser = 'Edge';
  else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) browser = 'Internet Explorer';
  
  return browser;
};

// Session logging utility
export const SessionLogger = {
  currentSessionId: null,
  activityBuffer: [],
  lastActivityTime: null,

  // Initialize session on login
  async startSession(user) {
    try {
      const sessionId = generateSessionId();
      this.currentSessionId = sessionId;
      this.lastActivityTime = new Date().toISOString();

      const sessionLog = await base44.entities.SessionLog.create({
        session_id: sessionId,
        user_id: user.email,
        user_role: user.portal_role || user.role,
        login_time: new Date().toISOString(),
        session_status: 'Active',
        authentication_method: 'Password', // Default, can be updated based on auth method
        device_type: getDeviceType(),
        browser: getBrowserInfo(),
        user_agent: navigator.userAgent,
        environment: window.location.hostname.includes('localhost') ? 'Development' : 'Production',
        activity_snapshot: [],
        last_activity: new Date().toISOString(),
        error_count: 0,
        retention_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      // Store session ID in sessionStorage for correlation
      sessionStorage.setItem('app_session_id', sessionId);
      sessionStorage.setItem('session_log_id', sessionLog.id);

      return sessionLog;
    } catch (error) {
      // Logging failure should not block user access
      console.error('Failed to start session log:', error);
    }
  },

  // Log activity during session
  async logActivity(module, action, page) {
    try {
      const sessionLogId = sessionStorage.getItem('session_log_id');
      if (!sessionLogId) return;

      const activity = {
        timestamp: new Date().toISOString(),
        module,
        action,
        page
      };

      this.activityBuffer.push(activity);
      this.lastActivityTime = new Date().toISOString();

      // Batch update every 10 activities or 5 minutes
      if (this.activityBuffer.length >= 10) {
        await this.flushActivityBuffer();
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  },

  // Flush activity buffer to database
  async flushActivityBuffer() {
    try {
      const sessionLogId = sessionStorage.getItem('session_log_id');
      if (!sessionLogId || this.activityBuffer.length === 0) return;

      const sessionLog = await base44.entities.SessionLog.filter({ id: sessionLogId });
      if (sessionLog.length === 0) return;

      const existingActivities = sessionLog[0].activity_snapshot || [];
      const updatedActivities = [...existingActivities, ...this.activityBuffer];

      await base44.entities.SessionLog.update(sessionLogId, {
        activity_snapshot: updatedActivities,
        last_activity: this.lastActivityTime
      });

      this.activityBuffer = [];
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
    }
  },

  // End session on logout
  async endSession(status = 'Logged_Out') {
    try {
      const sessionLogId = sessionStorage.getItem('session_log_id');
      if (!sessionLogId) return;

      // Flush remaining activities
      await this.flushActivityBuffer();

      const sessionLog = await base44.entities.SessionLog.filter({ id: sessionLogId });
      if (sessionLog.length === 0) return;

      const loginTime = new Date(sessionLog[0].login_time);
      const logoutTime = new Date();
      const durationMinutes = Math.round((logoutTime - loginTime) / 1000 / 60);

      await base44.entities.SessionLog.update(sessionLogId, {
        logout_time: logoutTime.toISOString(),
        session_status: status,
        session_duration_minutes: durationMinutes,
        last_activity: this.lastActivityTime
      });

      // Clean up
      sessionStorage.removeItem('app_session_id');
      sessionStorage.removeItem('session_log_id');
      this.currentSessionId = null;
      this.activityBuffer = [];
    } catch (error) {
      console.error('Failed to end session log:', error);
    }
  },

  // Log error during session
  async logError() {
    try {
      const sessionLogId = sessionStorage.getItem('session_log_id');
      if (!sessionLogId) return;

      const sessionLog = await base44.entities.SessionLog.filter({ id: sessionLogId });
      if (sessionLog.length === 0) return;

      await base44.entities.SessionLog.update(sessionLogId, {
        error_count: (sessionLog[0].error_count || 0) + 1
      });
    } catch (error) {
      console.error('Failed to log error count:', error);
    }
  },

  // Update last activity timestamp (heartbeat)
  async updateHeartbeat() {
    try {
      const sessionLogId = sessionStorage.getItem('session_log_id');
      if (!sessionLogId) return;

      this.lastActivityTime = new Date().toISOString();

      await base44.entities.SessionLog.update(sessionLogId, {
        last_activity: this.lastActivityTime
      });
    } catch (error) {
      // Silent fail for heartbeat
    }
  }
};

// React Hook for automatic session logging
export function useSessionLogger(user, currentPage) {
  const location = useLocation();
  const sessionInitialized = useRef(false);
  const heartbeatInterval = useRef(null);
  const activityInterval = useRef(null);

  useEffect(() => {
    // Initialize session on mount if user is logged in
    if (user && !sessionInitialized.current) {
      SessionLogger.startSession(user);
      sessionInitialized.current = true;

      // Set up heartbeat (every 5 minutes)
      heartbeatInterval.current = setInterval(() => {
        SessionLogger.updateHeartbeat();
      }, 5 * 60 * 1000);

      // Set up activity buffer flush (every 5 minutes)
      activityInterval.current = setInterval(() => {
        SessionLogger.flushActivityBuffer();
      }, 5 * 60 * 1000);
    }

    // Cleanup on unmount
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (activityInterval.current) clearInterval(activityInterval.current);
    };
  }, [user]);

  // Log page navigation
  useEffect(() => {
    if (user && currentPage) {
      SessionLogger.logActivity('Navigation', 'Page View', currentPage);
    }
  }, [location.pathname, currentPage, user]);

  return null;
}

// Helper function to log critical actions
export const logCriticalAction = (module, action, details = '') => {
  const page = window.location.pathname.split('/').pop() || 'Dashboard';
  SessionLogger.logActivity(module, `${action}${details ? ': ' + details : ''}`, page);
};

export default SessionLogger;