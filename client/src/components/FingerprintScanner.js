import React, { useState, useRef, useEffect } from 'react';
import { Fingerprint, AlertCircle, CheckCircle, Loader } from 'lucide-react';

const FingerprintScanner = ({ onScan, onError, isScanning = false, disabled = false }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera
  useEffect(() => {
    if (isScanning && !disabled) {
      initializeCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isScanning, disabled]);

  const initializeCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera access to scan fingerprint.');
      onError && onError(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureFingerprint = async () => {
    if (!videoRef.current || !canvasRef.current || disabled) return;

    try {
      setIsCapturing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      // Convert blob to base64
      const base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Generate fingerprint data (simplified)
      const fingerprintData = {
        image: base64,
        timestamp: Date.now(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        }
      };

      setScanResult(fingerprintData);
      onScan && onScan(fingerprintData);
    } catch (err) {
      console.error('Fingerprint capture error:', err);
      setError('Failed to capture fingerprint. Please try again.');
      onError && onError(err);
    } finally {
      setIsCapturing(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setError(null);
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
        <div className="text-center">
          <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Fingerprint scanning disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      {isScanning && (
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 object-cover"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-white rounded-full opacity-50"></div>
          </div>

          {/* Status Indicator */}
          <div className="absolute top-4 right-4">
            {isCapturing ? (
              <div className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Capturing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Ready</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex flex-col space-y-3">
        {!isScanning ? (
          <button
            onClick={() => onScan && onScan({ start: true })}
            className="btn btn-primary w-full"
          >
            <Fingerprint className="w-5 h-5" />
            Start Fingerprint Scan
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={captureFingerprint}
              disabled={isCapturing}
              className="btn btn-primary flex-1"
            >
              {isCapturing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  Capture Fingerprint
                </>
              )}
            </button>
            
            <button
              onClick={stopCamera}
              className="btn btn-secondary"
            >
              Stop Camera
            </button>
          </div>
        )}

        {scanResult && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">Fingerprint captured successfully</span>
            <button
              onClick={resetScan}
              className="ml-auto text-sm text-green-600 hover:text-green-800"
            >
              Retake
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Instructions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Position your finger over the camera</li>
          <li>Ensure good lighting and clear visibility</li>
          <li>Keep your finger steady during capture</li>
          <li>Make sure your finger covers the circular area</li>
        </ul>
      </div>
    </div>
  );
};

export default FingerprintScanner;
