import { useState } from 'react';
import { base44 } from '@/api/ClientApi';
import { Upload, Loader2, Check, AlertCircle, Copy } from 'lucide-react';

export default function OCRUploader() {
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setExtracted('');
    setFileName(file.name);

    try {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Supported: JPEG, PNG, WebP, PDF');
      }

      // Upload and extract
      const result = await base44.ocr.extractText(file);

      setExtracted(result.text);
      setMetadata({
        confidence: (result.confidence * 100).toFixed(2),
        language: result.language,
        engine: result.engine
      });
    } catch (err) {
      setError(err.message || 'OCR processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extracted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Document OCR</h2>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 hover:border-blue-400 transition">
        <label className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-12 h-12 text-gray-400" />
          <span className="text-lg font-medium text-gray-700">
            Click to upload or drag & drop
          </span>
          <span className="text-sm text-gray-500">
            Supports JPEG, PNG, WebP, PDF (Max 10MB)
          </span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Processing */}
      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3 items-center">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="font-semibold text-blue-900">Processing...</p>
            <p className="text-sm text-blue-700">Extracting text from {fileName}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {extracted && metadata && (
        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded border border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm">
                <span className="font-semibold">Confidence:</span> {metadata.confidence}%
              </span>
            </div>
            <div className="px-3 py-2 bg-gray-100 rounded">
              <span className="text-sm">
                <span className="font-semibold">Engine:</span> {metadata.engine}
              </span>
            </div>
          </div>

          {/* Extracted Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-700">Extracted Text</label>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={extracted}
              readOnly
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setExtracted('');
                setMetadata(null);
                setFileName('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}