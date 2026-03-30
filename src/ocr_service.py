#!/usr/bin/env python3
# ============================================================================
# LOCAL OCR SERVICE - FastAPI + PaddleOCR
# ============================================================================
# 
# Setup:
#   python -m venv ocr_env
#   source ocr_env/bin/activate
#   pip install paddleocr fastapi uvicorn python-multipart pillow opencv-python numpy
#
# Run:
#   uvicorn ocr_service:app --host 127.0.0.1 --port 8000
#
# Test:
#   curl -F "file=@path/to/image.jpg" http://127.0.0.1:8000/extract
#

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
import cv2
import numpy as np
import io
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Local OCR Service", version="1.0.0")

# Initialize PaddleOCR (downloads model on first run ~100MB)
# Set use_gpu=True if CUDA available
ocr = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=False  # Set to True if GPU available
)

# ============================================================================
# IMAGE PREPROCESSING FUNCTIONS
# ============================================================================

def preprocess_image(image_bytes) -> np.ndarray:
    """
    Preprocess image for better OCR accuracy
    
    Steps:
    1. Denoise - Remove noise
    2. Grayscale - Convert to single channel
    3. CLAHE - Enhance contrast adaptively
    4. Binarization - Convert to B&W (optional)
    """
    try:
        # Read image from bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        # Step 1: Denoise
        denoised = cv2.fastNlMeansDenoising(
            img,
            h=10,
            templateWindowSize=7,
            searchWindowSize=21
        )
        
        # Step 2: Convert to grayscale
        gray = cv2.cvtColor(denoised, cv2.COLOR_BGR2GRAY)
        
        # Step 3: Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Step 4: Optional - Threshold for high-contrast B&W
        # Uncomment for document scans
        # _, binary = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
        # return binary
        
        return enhanced
    
    except Exception as e:
        logger.error(f"Preprocessing error: {str(e)}")
        # Return original if preprocessing fails
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def extract_text_from_results(ocr_results) -> tuple[str, float]:
    """
    Extract and format text from PaddleOCR results
    Returns: (extracted_text, average_confidence)
    """
    if not ocr_results or not ocr_results[0]:
        return "", 0.0
    
    text_lines = []
    confidences = []
    
    for line in ocr_results[0]:
        if line[1]:  # text
            text_lines.append(line[1])
            confidences.append(float(line[2]))  # confidence score
    
    extracted_text = "\n".join(text_lines)
    avg_confidence = np.mean(confidences) if confidences else 0.0
    
    return extracted_text, float(avg_confidence)


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from image using PaddleOCR
    
    Supports: JPEG, PNG, WebP, BMP, TIFF
    Returns: Extracted text + confidence score + raw results
    """
    try:
        # Read file
        contents = await file.read()
        
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Preprocess image
        logger.info(f"Preprocessing image: {file.filename}")
        processed_img = preprocess_image(contents)
        
        # Run OCR
        logger.info("Running PaddleOCR...")
        ocr_results = ocr.ocr(processed_img, cls=True)
        
        # Extract text
        extracted_text, confidence = extract_text_from_results(ocr_results)
        
        logger.info(f"OCR completed. Confidence: {confidence:.2%}")
        
        return {
            "success": True,
            "data": {
                "text": extracted_text,
                "confidence": confidence,
                "language": "en",
                "raw_results": ocr_results
            }
        }
    
    except Exception as e:
        logger.error(f"OCR extraction error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }, 500


@app.post("/extract-batch")
async def extract_batch(files: list[UploadFile] = File(...)):
    """
    Extract text from multiple images in batch
    
    Returns: List of extraction results
    """
    try:
        results = []
        
        for file in files:
            try:
                contents = await file.read()
                processed_img = preprocess_image(contents)
                ocr_results = ocr.ocr(processed_img, cls=True)
                extracted_text, confidence = extract_text_from_results(ocr_results)
                
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "text": extracted_text,
                    "confidence": confidence
                })
            
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "data": results,
            "processed": len([r for r in results if r["success"]]),
            "total": len(files)
        }
    
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }, 500


@app.post("/validate-aadhaar")
async def validate_aadhaar(file: UploadFile = File(...)):
    """
    Extract and validate Aadhaar number from document image
    
    Aadhaar format: 12 digits (XXXX XXXX XXXX)
    """
    try:
        contents = await file.read()
        processed_img = preprocess_image(contents)
        ocr_results = ocr.ocr(processed_img, cls=True)
        extracted_text, _ = extract_text_from_results(ocr_results)
        
        # Extract Aadhaar (12-digit number)
        import re
        aadhaar_match = re.search(r'\b(\d{4}\s\d{4}\s\d{4})\b|\b(\d{12})\b', extracted_text)
        aadhaar = (aadhaar_match.group(1) or aadhaar_match.group(2)).replace(' ', '') if aadhaar_match else None
        
        return {
            "success": True,
            "data": {
                "aadhaar": aadhaar,
                "found": aadhaar is not None,
                "full_text": extracted_text,
                "confidence": 0.85 if aadhaar else 0
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }, 500


@app.post("/validate-pan")
async def validate_pan(file: UploadFile = File(...)):
    """
    Extract and validate PAN number from document image
    
    PAN format: 10 characters (5 letters + 4 digits + 1 letter)
    Example: AABPU5055K
    """
    try:
        contents = await file.read()
        processed_img = preprocess_image(contents)
        ocr_results = ocr.ocr(processed_img, cls=True)
        extracted_text, _ = extract_text_from_results(ocr_results)
        
        # Extract PAN
        import re
        pan_match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', extracted_text)
        pan = pan_match.group(1) if pan_match else None
        
        return {
            "success": True,
            "data": {
                "pan": pan,
                "found": pan is not None,
                "full_text": extracted_text,
                "confidence": 0.90 if pan else 0
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }, 500


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Local OCR Service",
        "engine": "PaddleOCR",
        "version": "1.0.0"
    }


@app.get("/info")
async def info():
    """Service information"""
    return {
        "name": "Local OCR Service",
        "version": "1.0.0",
        "engine": "PaddleOCR",
        "supported_formats": ["JPEG", "PNG", "WebP", "BMP", "TIFF"],
        "languages": ["English"],
        "endpoints": [
            "/extract - Single image OCR",
            "/extract-batch - Batch processing",
            "/validate-aadhaar - Aadhaar extraction",
            "/validate-pan - PAN extraction",
            "/health - Health check",
            "/info - Service info"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)