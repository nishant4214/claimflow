// ============================================================================
// CONFIG ROUTES
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  getAllConfig,
  updateConfig,
  getWorkflowConfig
} = require('../controllers/configController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/config
router.get('/', getAllConfig);

// GET /api/config/workflow
router.get('/workflow', getWorkflowConfig);

// PUT /api/config (requires admin)
router.put('/', roleMiddleware(['super_admin']), updateConfig);

module.exports = router;