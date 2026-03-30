// ============================================================================
// OCR CONTROLLER - Local OCR Processing
// ============================================================================

const axios = require('axios');

/**
 * Extract text from image using local Python OCR service
 * Falls back to Tesseract.js if Python service unavailable
 */
exports.extractTextFromImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const file = req.file;
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Supported: JPEG, PNG, WebP, PDF'
      });
    }

    // Try Python FastAPI service first (recommended)
    try {
      const result = await extractUsingPython(file.buffer, file.originalname);
      return res.json({
        success: true,
        data: result,
        engine: 'PaddleOCR'
      });
    } catch (pythonError) {
      console.log('Python service unavailable, falling back to Node.js...');
    }

    // Fallback to Tesseract.js
    const result = await extractUsingTesseract(file.buffer);
    return res.json({
      success: true,
      data: result,
      engine: 'Tesseract.js',
      warning: 'Using fallback engine (slower)'
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OCR processing failed'
    });
  }
};

/**
 * Extract text using local Python FastAPI service
 * Requires: pip install paddleocr fastapi uvicorn
 * Run: uvicorn ocr_service:app --host 127.0.0.1 --port 8000
 */
async function extractUsingPython(fileBuffer, filename) {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
  formData.append('file', blob, filename);

  const response = await axios.post(
    'http://127.0.0.1:8000/extract',
    formData,
    {
      headers: formData.getHeaders(),
      timeout: 30000 // 30s timeout for OCR processing
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Python OCR service error');
  }

  return response.data.data;
}

/**
 * Extract text using Tesseract.js (Node.js native)
 * Install: npm install tesseract.js sharp
 */
async function extractUsingTesseract(fileBuffer) {
  try {
    const Tesseract = require('tesseract.js');
    const sharp = require('sharp');

    // Preprocess image for better accuracy
    const processed = await preprocessImage(fileBuffer);

    // Run OCR
    const result = await Tesseract.recognize(processed, 'eng', {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
        }
      }
    });

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      language: 'eng',
      blocks: result.data.blocks
    };
  } catch (error) {
    throw new Error(`Tesseract.js error: ${error.message}`);
  }
}

/**
 * Preprocess image for better OCR accuracy
 * Uses sharp library for image manipulation
 */
async function preprocessImage(fileBuffer) {
  try {
    const sharp = require('sharp');

    return await sharp(fileBuffer)
      // Resize to standard DPI (200 DPI equivalent)
      .resize(2000, 3000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Convert to grayscale
      .grayscale()
      // Enhance contrast
      .normalize()
      .toBuffer();
  } catch (error) {
    console.warn('Preprocessing failed, using original image:', error.message);
    return fileBuffer;
  }
}

/**
 * Extract and validate Aadhaar number from OCR text
 */
exports.validateAadhaar = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'No text provided'
      });
    }

    // Extract Aadhaar (12-digit number)
    const aadhaarMatch = text.match(/\b(\d{4}\s\d{4}\s\d{4})\b|\b(\d{12})\b/);
    const aadhaar = aadhaarMatch ? (aadhaarMatch[1] || aadhaarMatch[2]).replace(/\s/g, '') : null;

    res.json({
      success: true,
      data: {
        aadhaar: aadhaar || null,
        found: !!aadhaar,
        confidence: aadhaar ? 0.85 : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Extract and validate PAN number from OCR text
 */
exports.validatePAN = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'No text provided'
      });
    }

    // Extract PAN (10 characters: 5 letters, 4 digits, 1 letter)
    const panMatch = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
    const pan = panMatch ? panMatch[1] : null;

    res.json({
      success: true,
      data: {
        pan: pan || null,
        found: !!pan,
        confidence: pan ? 0.90 : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Batch OCR processing for multiple files
 */
exports.batchExtractText = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const result = await exports.extractTextFromImage(
          { file },
          { json: (data) => results.push({ ...data, filename: file.originalname }) }
        );
      } catch (error) {
        results.push({
          success: false,
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      processed: results.length,
      total: req.files.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};