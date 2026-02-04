import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, ZoomOut, Download, X, ChevronLeft, 
  ChevronRight, Maximize2, Minimize2 
} from "lucide-react";
import { toast } from 'sonner';

export default function DocumentViewer({ isOpen, onClose, documentUrl, documentName }) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fileExtension = documentUrl?.split('.').pop()?.toLowerCase();
  const isPDF = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);

  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setIsFullscreen(false);
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, documentUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName || 'document';
    link.click();
    toast.success('Download started');
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load document');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl h-[85vh]'} p-0 gap-0`}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {documentName || 'Document Preview'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[50px] text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 gap-1.5 px-3"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex items-center justify-center min-h-full">
            {isLoading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading document...</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-gray-900 font-medium mb-2">Failed to load document</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download instead
                </Button>
              </div>
            )}

            {!error && isPDF && (
              <iframe
                src={documentUrl}
                className="w-full bg-white shadow-lg rounded-lg"
                style={{ 
                  height: isFullscreen ? 'calc(95vh - 100px)' : 'calc(85vh - 100px)',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}

            {!error && isImage && (
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full h-auto bg-white shadow-lg rounded-lg"
                style={{ 
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}

            {!error && !isPDF && !isImage && (
              <div className="text-center bg-white rounded-lg p-8 shadow-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-900 font-medium mb-2">Preview not available</p>
                <p className="text-gray-600 text-sm mb-4">
                  This file type cannot be previewed in the browser
                </p>
                <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}