// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization header'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ============================================================================
// ROLE BASED ACCESS CONTROL (RBAC)
// ============================================================================

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.portal_role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};