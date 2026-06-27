"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebcamOptions {
  width?: number;
  height?: number;
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const { width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize stream with video ref once mounted
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isActive]);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      if (streamRef.current) {
        stopStream();
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "user",
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
    } catch (err: any) {
      console.error("Error accessing webcam:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please grant permission in your browser.");
      } else if (err.name === "NotFoundError") {
        setError("No camera device found.");
      } else {
        setError("Unable to access camera: " + err.message);
      }
      setIsActive(false);
    }
  }, [width, height]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isActive) return null;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || width;
    canvas.height = video.videoHeight || height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Flip horizontally for mirroring
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get JPEG base64 string
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [isActive, width, height]);

  return {
    videoRef,
    isActive,
    error,
    startStream,
    stopStream,
    captureFrame,
  };
}
