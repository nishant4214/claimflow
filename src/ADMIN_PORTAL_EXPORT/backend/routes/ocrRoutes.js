// ============================================================================
// OCR ROUTES
// ============================================================================

const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const ocrController = require('../controllers/ocrController');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /api/ocr/extract
 * Extract text from single image/PDF
 * Supports: JPEG, PNG, WebP, PDF
 */
router.post(
  '/extract',
  authMiddleware,
  upload.single('file'),
  ocrController.extractTextFromImage
);

/**
 * POST /api/ocr/batch
 * Extract text from multiple files
 */
router.post(
  '/batch',
  authMiddleware,
  upload.array('files', 10),
  ocrController.batchExtractText
);

/**
 * POST /api/ocr/validate-aadhaar
 * Validate Aadhaar number from OCR text
 */
router.post(
  '/validate-aadhaar',
  authMiddleware,
  ocrController.validateAadhaar
);

/**
 * POST /api/ocr/validate-pan
 * Validate PAN number from OCR text
 */
router.post(
  '/validate-pan',
  authMiddleware,
  ocrController.validatePAN
);

module.exports = router;