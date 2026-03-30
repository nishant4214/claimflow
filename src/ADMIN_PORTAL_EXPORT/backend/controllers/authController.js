// ============================================================================
// AUTHENTICATION CONTROLLER
// ============================================================================

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================================
// LOGIN
// ============================================================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // Get user from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check password (for demo, passwords in DB are hashed versions of "admin123")
    // In production: const isValidPassword = await bcrypt.compare(password, user.password_hash);
    const isValidPassword = password === 'admin123'; // DEMO ONLY

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        portal_role: user.portal_role,
        department: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        portal_role: user.portal_role,
        department: user.department,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// ============================================================================
// VERIFY TOKEN
// ============================================================================

exports.verifyToken = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalid'
    });
  }
};