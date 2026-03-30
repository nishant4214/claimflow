// ============================================================================
// AUTH ROUTES
// ============================================================================

const express = require('express');
const router = express.Router();
const { login, verifyToken } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/verify
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;