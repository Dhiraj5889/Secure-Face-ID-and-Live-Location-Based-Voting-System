import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  width: { ideal: 320 },
  height: { ideal: 240 },
  facingMode: 'user'
};

const FaceCapture = ({ onCapture, onError, disabled, isCapturing }) => {
  const webcamRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  const stopStream = () => {
    try {
      const stream = webcamRef.current && (webcamRef.current.stream || webcamRef.current.video?.srcObject);
      if (stream && stream.getTracks) {
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (_) {}
  };

  const handleCapture = async () => {
    try {
      setCapturing(true);

      // Ensure stream is ready
      if (!ready) {
        // small grace period
        await wait(200);
      }

      // Retry a few times as getScreenshot may return null until a frame is available
      let imageSrc = null;
      for (let i = 0; i < 10; i += 1) {
        imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) break;
        await wait(100);
      }

      if (!imageSrc) throw new Error('Unable to capture image');

      setPreview(imageSrc);
      onCapture?.(imageSrc);
      // Close camera stream after capture
      stopStream();
      setReady(false);
    } catch (e) {
      onError?.(e);
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setReady(false);
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <>
          <div className="rounded-xl overflow-hidden border border-neutral-200">
            <img src={preview} alt="Face preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className="w-full py-3 rounded-lg font-semibold bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-800"
          >
            Retake
          </button>
        </>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-neutral-200 bg-black/5">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.6}
              videoConstraints={videoConstraints}
              mirrored
              onUserMedia={() => setReady(true)}
              onUserMediaError={(e) => {
                setReady(false);
                onError?.(e);
              }}
              style={{ width: '100%' }}
            />
          </div>
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled || capturing || isCapturing || !ready}
            className={`w-full py-3 rounded-lg font-semibold ${disabled || capturing ? 'bg-neutral-300 text-neutral-500' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {capturing ? 'Capturing...' : (!ready ? 'Initializing camera…' : 'Capture Face')}
          </button>
        </>
      )}
    </div>
  );
};

export default FaceCapture;
