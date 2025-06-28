
import { useRef, useCallback, useEffect, useState } from 'react';
import jsQR from 'jsqr';

interface UseQRScannerProps {
  onQRCodeDetected: (data: string) => void;
  isScanning: boolean;
}

export const useQRScanner = ({ onQRCodeDetected, isScanning }: UseQRScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [lastDetectedCode, setLastDetectedCode] = useState<string>('');
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0);

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data from canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Scan for QR code
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode) {
      const currentTime = Date.now();
      // Prevent duplicate detections within 2 seconds
      if (qrCode.data !== lastDetectedCode || currentTime - lastDetectionTime > 2000) {
        console.log('QR Code detected:', qrCode.data);
        setLastDetectedCode(qrCode.data);
        setLastDetectionTime(currentTime);
        onQRCodeDetected(qrCode.data);
      }
    }

    // Continue scanning
    if (isScanning) {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [onQRCodeDetected, isScanning, lastDetectedCode, lastDetectionTime]);

  useEffect(() => {
    if (isScanning) {
      console.log('Starting QR scan loop');
      scanQRCode();
    } else {
      console.log('Stopping QR scan loop');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scanQRCode]);

  return { videoRef, canvasRef };
};
