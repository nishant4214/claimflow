// ============================================================================
// USER CONTROLLER
// ============================================================================

const pool = require('../config/database');

// ============================================================================
// GET ALL USERS
// ============================================================================

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.email, u.full_name, u.portal_role,
        u.department, u.designation, u.is_active,
        u.created_at, r.display_label
      FROM users u
      LEFT JOIN roles r ON u.portal_role = r.name
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// ============================================================================
// GET ROLES
// ============================================================================

exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM roles
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
};

// ============================================================================
// UPDATE USER ROLE
// ============================================================================

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { portal_role, full_name } = req.body;

    const result = await pool.query(`
      UPDATE users
      SET portal_role = $1, full_name = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [portal_role, full_name, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// ============================================================================
// GET CURRENT USER
// ============================================================================

exports.getCurrentUser = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, email, full_name, portal_role,
        department, designation
      FROM users
      WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};