'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureProps {
  onImageCaptured: (file: File) => void;
}

export default function CameraCapture({ onImageCaptured }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setIsCameraOn(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError(
        'Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.'
      );
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `bai-lam-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          setCapturedImage(URL.createObjectURL(blob));
          onImageCaptured(file);
          stopCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Warning notice */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-accent-yellow/20 border border-accent-yellow/50 rounded-xl p-3 text-sm"
      >
        <p className="font-semibold text-amber-700 mb-1">
          Lưu ý khi chụp ảnh bài làm:
        </p>
        <ul className="text-amber-600 text-xs space-y-0.5 list-disc list-inside">
          <li>Chụp rõ nét, đủ ánh sáng</li>
          <li>Đặt giấy trên mặt phẳng, không bị nhăn/gấp</li>
          <li>Chụp thẳng, không bị nghiêng quá nhiều</li>
          <li>
            <strong>Khuyến nghị:</strong> Dùng camera điện thoại cho chất lượng tốt nhất
          </li>
        </ul>
      </motion.div>

      {error && (
        <p className="text-accent-red text-sm font-medium">{error}</p>
      )}

      <AnimatePresence mode="wait">
        {capturedImage ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <img
              src={capturedImage}
              alt="Bài làm"
              className="w-full rounded-xl border-2 border-accent-green shadow-lg"
            />
            <div className="flex gap-3 mt-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={retake}
                className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Chụp lại
              </motion.button>
              <p className="flex items-center text-accent-green text-sm font-semibold">
                Đã chụp thành công
              </p>
            </div>
          </motion.div>
        ) : isCameraOn ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl border-2 border-primary shadow-lg"
            />
            <div className="flex gap-3 mt-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={capturePhoto}
                className="px-6 py-2.5 bg-primary border-2 border-primary-dark text-white rounded-xl text-sm font-black shadow-[4px_4px_0_#2D3436]"
              >
                Chụp ảnh
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopCamera}
                className="px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold"
              >
                Huỷ
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center py-8"
          >
            <svg className="w-12 h-12 mb-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startCamera}
              className="px-6 py-3 bg-primary border-2 border-primary-dark text-white rounded-xl font-black shadow-[4px_4px_0_#2D3436] hover:translate-y-[-2px] transition-transform"
            >
              Mở Camera
            </motion.button>
            {/* File upload fallback */}
            <label className="mt-4 cursor-pointer">
              <span className="text-sm text-text-secondary hover:text-primary transition-colors underline">
                Hoặc chọn ảnh từ thiết bị
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCapturedImage(URL.createObjectURL(file));
                    onImageCaptured(file);
                  }
                }}
              />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
