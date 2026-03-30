// ============================================================================
// CLAIMS CONTROLLER
// ============================================================================

const pool = require('../config/database');

// ============================================================================
// GET ALL CLAIMS
// ============================================================================

exports.getAllClaims = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*, 
        u.full_name,
        cat.title as category_title
      FROM claims c
      LEFT JOIN users u ON c.employee_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims'
    });
  }
};

// ============================================================================
// GET CLAIMS BY USER
// ============================================================================

exports.getClaimsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*, 
        cat.title as category_title
      FROM claims c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.employee_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user claims'
    });
  }
};

// ============================================================================
// CREATE CLAIM
// ============================================================================

exports.createClaim = async (req, res) => {
  try {
    const {
      employee_id,
      category_id,
      category_name,
      expense_date_from,
      expense_date_to,
      purpose,
      amount,
      department
    } = req.body;

    // Generate claim number
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000);
    const claim_number = `CLM-${year}-${String(random).padStart(4, '0')}`;

    const result = await pool.query(`
      INSERT INTO claims (
        claim_number, employee_id, category_id, category_name,
        expense_date_from, expense_date_to, purpose, amount,
        department, status, employee_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      claim_number, employee_id, category_id, category_name,
      expense_date_from, expense_date_to, purpose, amount,
      department, 'draft', req.user?.email
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Claim created successfully'
    });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create claim'
    });
  }
};

// ============================================================================
// UPDATE CLAIM STATUS
// ============================================================================

exports.updateClaimStatus = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, remarks } = req.body;

    const result = await pool.query(`
      UPDATE claims
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, claimId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Log approval
    await pool.query(`
      INSERT INTO approvals (
        claim_id, approver_id, approver_role, action, remarks,
        new_status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [claimId, req.user.id, req.user.portal_role, status, remarks, status]);

    res.json({
      success: true,
      data: result.rows[0],
      message: `Claim ${status} successfully`
    });
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update claim'
    });
  }
};

// ============================================================================
// GET CATEGORIES
// ============================================================================

exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM categories
      WHERE is_active = true
      ORDER BY category_name, title
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// ============================================================================
// GET CLAIM BY ID
// ============================================================================

exports.getClaimById = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claimResult = await pool.query(`
      SELECT c.*, cat.title as category_title
      FROM claims c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = $1
    `, [claimId]);

    if (claimResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const approvalsResult = await pool.query(`
      SELECT a.*, u.full_name
      FROM approvals a
      LEFT JOIN users u ON a.approver_id = u.id
      WHERE a.claim_id = $1
      ORDER BY a.created_at DESC
    `, [claimId]);

    res.json({
      success: true,
      data: {
        claim: claimResult.rows[0],
        approvals: approvalsResult.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claim'
    });
  }
};