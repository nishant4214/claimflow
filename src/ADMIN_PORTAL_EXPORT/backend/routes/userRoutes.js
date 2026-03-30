// ============================================================================
// USER ROUTES
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getRoles,
  updateUserRole,
  getCurrentUser
} = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', getCurrentUser);

// GET /api/users (requires admin)
router.get('/', roleMiddleware(['admin_head', 'super_admin']), getAllUsers);

// GET /api/users/roles
router.get('/roles', getRoles);

// PUT /api/users/:userId/role
router.put('/:userId/role', roleMiddleware(['admin_head', 'super_admin']), updateUserRole);

module.exports = router;