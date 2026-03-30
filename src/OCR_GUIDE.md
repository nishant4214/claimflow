# Complete Local OCR Solution Guide

## Overview
A production-ready, cost-free OCR pipeline using only open-source libraries. No external APIs, no paid services — everything runs locally on your server.

---

## Part 1: Open-Source OCR Libraries Comparison

### Recommended: **Tesseract.js** (Best for Node.js)
**Why Choose:**
- ✅ Most mature open-source OCR engine
- ✅ Works in Node.js (via Tesseract.js wrapper)
- ✅ Supports 100+ languages
- ✅ Good accuracy for documents (85-95%)
- ✅ Zero external dependencies
- ✅ Active community & regular updates
- ❌ Slower than GPU-based solutions

**Best For:** Aadhaar, PAN cards, invoices, scanned documents

**Installation:**
```bash
npm install tesseract.js
```

---

### Alternative 1: **PaddleOCR** (Python - Fastest)
**Why Choose:**
- ✅ Industry-leading speed & accuracy
- ✅ Multi-language support
- ✅ Optimized for Asian languages (Hindi, Gujarati, etc.)
- ✅ Excellent for document OCR
- ✅ GPU acceleration available
- ❌ Requires Python + FastAPI backend

**Best For:** High-volume processing, document verification, Asian languages

**Installation:**
```bash
pip install paddleocr
pip install fastapi uvicorn python-multipart
```

---

### Alternative 2: **EasyOCR** (Python - Balanced)
**Why Choose:**
- ✅ Easy setup & great accuracy
- ✅ Deep learning based
- ✅ Supports 80+ languages
- ✅ Good for complex layouts
- ❌ Slower than PaddleOCR
- ❌ Requires Python

**Installation:**
```bash
pip install easyocr
```

---

### Comparison Table

| Feature | Tesseract.js | PaddleOCR | EasyOCR |
|---------|-------------|-----------|---------|
| **Language** | JavaScript/Node.js | Python | Python |
| **Speed** | Slow (5-15s) | Fast (1-3s) | Medium (3-8s) |
| **Accuracy** | 80-90% | 92-98% | 88-95% |
| **Setup Complexity** | Easy | Medium | Easy |
| **GPU Support** | No | Yes | Yes |
| **Best For** | Node.js apps | Volume processing | Balanced use |
| **License** | Apache 2.0 | Apache 2.0 | MIT |

---

## Part 2: Recommended Architecture

### Option A: Node.js + Tesseract.js (Simplest)
```
Frontend (React) 
    ↓
ClientApi.js (calls /api/ocr/extract)
    ↓
Backend (Express) → functions/ocrProcessor.js
    ↓
Tesseract.js (local, runs in Node.js)
    ↓
Returns extracted text
```

**Pros:** Single tech stack, easy integration  
**Cons:** Slower processing

---

### Option B: Node.js + Python Service (Recommended for Production)
```
Frontend (React)
    ↓
ClientApi.js (calls /api/ocr/extract)
    ↓
Backend (Express) → /api/ocr/extract
    ↓
HTTP call to Python service (localhost:8000)
    ↓
Python FastAPI + PaddleOCR
    ↓
Returns extracted text + confidence scores
```

**Pros:** Best speed/accuracy, separate scaling  
**Cons:** Requires Python setup

---

## Part 3: Implementation

### Step 1: Choose Your Approach

**For Quick Setup**: Use Node.js + Tesseract.js (Part 3A)  
**For Production**: Use Python + PaddleOCR (Part 3B)

---

### Step 3A: Node.js + Tesseract.js Setup

**1. Install Tesseract.js**
```bash
cd backend
npm install tesseract.js sharp
```

**2. Create OCR Processor**
See `functions/ocrProcessor.js` (provided separately)

**3. Create Express Route**
```javascript
// backend/routes/ocrRoutes.js
const express = require('express');
const multer = require('multer');
const { extractTextFromImage } = require('../controllers/ocrController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/extract',
  authMiddleware,
  upload.single('file'),
  extractTextFromImage
);

module.exports = router;
```

**4. Create Controller**
```javascript
// backend/controllers/ocrController.js
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

exports.extractTextFromImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Preprocess image
    const processedImage = await sharp(req.file.buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .toBuffer();

    // Run OCR
    const result = await Tesseract.recognize(
      processedImage,
      'eng',
      { logger: (info) => console.log('Progress:', info.progress) }
    );

    res.json({
      success: true,
      data: {
        text: result.data.text,
        confidence: result.data.confidence,
        language: 'eng'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### Step 3B: Python + PaddleOCR Setup (Recommended)

**1. Create Python Virtual Environment**
```bash
python -m venv ocr_env
source ocr_env/bin/activate  # On Windows: ocr_env\Scripts\activate
```

**2. Install Dependencies**
```bash
pip install paddleocr fastapi uvicorn python-multipart pillow opencv-python
```

**3. Create FastAPI OCR Service**
```python
# ocr_service.py
from fastapi import FastAPI, UploadFile, File
from paddleocr import PaddleOCR
import cv2
import numpy as np
from io import BytesIO

app = FastAPI()

# Initialize OCR (downloads model on first run)
ocr = PaddleOCR(use_angle_cls=True, lang='en')

def preprocess_image(image_bytes):
    """Preprocess image for better OCR accuracy"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Increase contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(enhanced)
    
    return denoised

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Preprocess
        processed_img = preprocess_image(contents)
        
        # Run OCR
        result = ocr.ocr(processed_img, cls=True)
        
        # Extract and format text
        extracted_text = "\n".join([line[0][1] for line in result])
        confidence = np.mean([line[0][2] for line in result])
        
        return {
            "success": True,
            "data": {
                "text": extracted_text,
                "confidence": float(confidence),
                "language": "en",
                "raw_results": result  # For detailed processing
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}, 500

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**4. Start Python Service**
```bash
uvicorn ocr_service:app --host 127.0.0.1 --port 8000
```

**5. Call from Node.js Backend**
```javascript
// backend/controllers/ocrController.js
exports.extractTextFromImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const response = await fetch('http://127.0.0.1:8000/extract', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## Part 4: Image Preprocessing Best Practices

**Critical for Document OCR Accuracy:**

```javascript
const sharp = require('sharp');

async function preprocessDocument(imageBuffer) {
  return await sharp(imageBuffer)
    // 1. Resize for better OCR (target ~200 DPI equivalent)
    .resize(2400, 3200, { fit: 'inside', withoutEnlargement: true })
    
    // 2. Convert to grayscale (removes color noise)
    .grayscale()
    
    // 3. Normalize (stretch histogram)
    .normalize()
    
    // 4. Apply threshold (converts to B&W for crisp text)
    .threshold(127)
    
    .toBuffer();
}
```

**Python equivalent using OpenCV:**
```python
import cv2
import numpy as np

def preprocess_document(image_path):
    img = cv2.imread(image_path)
    
    # 1. Denoise
    denoised = cv2.fastNlMeansDenoising(img, h=10)
    
    # 2. Convert to grayscale
    gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
    
    # 3. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # 4. Threshold (optional - for high-contrast B&W)
    _, binary = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
    
    return binary
```

---

## Part 5: Frontend Integration

**React Component:**
```jsx
import { base44 } from '@/api/ClientApi';
import { useState } from 'react';

export default function OCRUpload() {
  const [extracted, setExtracted] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    setLoading(true);

    try {
      const result = await base44.ocr.extractText(file);
      setExtracted(result.text);
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*,application/pdf" onChange={handleUpload} />
      {loading && <p>Processing...</p>}
      {extracted && <textarea value={extracted} readOnly />}
    </div>
  );
}
```

---

## Part 6: Performance Tips

1. **Batch Processing**: Process multiple documents in queue
2. **Image Optimization**: Reduce file size before OCR
3. **Caching**: Cache OCR results for identical images
4. **GPU Acceleration**: Enable GPU for PaddleOCR (if available)
5. **Async Processing**: Use job queues for large batches
6. **Multi-language**: Load only needed language models

---

## Part 7: Accuracy Improvements for Document Types

### For Aadhaar/Government IDs:
```
✓ Preprocess with high contrast
✓ Deskew image (rotate to correct angle)
✓ Remove shadows/glare
✓ Enhance text regions
✓ Post-process with regex validation
```

### For Invoices/Bills:
```
✓ Table detection preprocessing
✓ Multi-column layout handling
✓ Currency/number validation
✓ Date format recognition
```

### For Handwritten Text:
```
⚠ Lower accuracy expected (60-75%)
✓ Preprocess heavily
✓ Use ML-based models (PaddleOCR better)
✗ Not recommended for critical data
```

---

## Summary: Recommended Setup

**For Your Use Case (Documents + Production):**

```
✅ Backend: Node.js + Express
✅ OCR Engine: PaddleOCR (Python FastAPI)
✅ Preprocessing: OpenCV (Python)
✅ Frontend: React with ClientApi
✅ Cost: $0 (all open-source)
```

**Execution Time:**
- Setup: 1-2 hours
- Per document: 2-5 seconds (PaddleOCR)
- Accuracy: 92-98%

---

## References

- **Tesseract.js**: https://github.com/naptha/tesseract.js
- **PaddleOCR**: https://github.com/PaddlePaddle/PaddleOCR
- **EasyOCR**: https://github.com/JaidedAI/EasyOCR
- **FastAPI**: https://fastapi.tiangolo.com/
- **OpenCV**: https://opencv.org/