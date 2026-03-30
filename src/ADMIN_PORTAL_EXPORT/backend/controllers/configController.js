// ============================================================================
// SYSTEM CONFIG CONTROLLER
// ============================================================================

const pool = require('../config/database');

// ============================================================================
// GET ALL CONFIG
// ============================================================================

exports.getAllConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM system_config
      WHERE is_active = true
      ORDER BY config_key
    `);

    // Convert to object format
    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch config'
    });
  }
};

// ============================================================================
// UPDATE CONFIG
// ============================================================================

exports.updateConfig = async (req, res) => {
  try {
    const { config_key, config_value } = req.body;

    const result = await pool.query(`
      UPDATE system_config
      SET config_value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE config_key = $2
      RETURNING *
    `, [config_value, config_key]);

    if (result.rows.length === 0) {
      // Insert if not exists
      const insertResult = await pool.query(`
        INSERT INTO system_config (config_key, config_value)
        VALUES ($1, $2)
        RETURNING *
      `, [config_key, config_value]);

      return res.json({
        success: true,
        data: insertResult.rows[0],
        message: 'Config created successfully'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Config updated successfully'
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update config'
    });
  }
};

// ============================================================================
// GET WORKFLOW CONFIG
// ============================================================================

exports.getWorkflowConfig = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM workflow_configs
      WHERE is_active = true
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow config'
    });
  }
};