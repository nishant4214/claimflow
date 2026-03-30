// ============================================================================
// CLAIM ROUTES
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  getAllClaims,
  getClaimsByUser,
  createClaim,
  updateClaimStatus,
  getCategories,
  getClaimById
} = require('../controllers/claimController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// GET /api/claims
router.get('/', getAllClaims);

// GET /api/claims/categories
router.get('/categories', getCategories);

// GET /api/claims/user/:userId
router.get('/user/:userId', getClaimsByUser);

// GET /api/claims/:claimId
router.get('/:claimId', getClaimById);

// POST /api/claims
router.post('/', createClaim);

// PUT /api/claims/:claimId/status
router.put('/:claimId/status', updateClaimStatus);

module.exports = router;