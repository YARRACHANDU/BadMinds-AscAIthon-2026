"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebcam } from "../hooks/useWebcam";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

interface WebcamCaptureProps {
  onFrameCapture?: (
    base64Image: string,
    objects: Array<{ label: string; confidence: number }>,
    environmental?: {
      brightnessLevel: number;
      illuminationScore: number;
      motionActivity: string;
      fanActivity: string;
      lightingStatus: string;
      lightingCondition: string;
    }
  ) => void;
  isProcessing?: boolean;
  intervalMs?: number; // Configurable sampling interval
}

// Analyze canvas pixels for brightness, histogram, motion, and localized fan activity
const analyzeVideoFrame = (
  video: HTMLVideoElement,
  prevGrayscale: number[] | null
): {
  environmental: {
    brightnessLevel: number;
    illuminationScore: number;
    motionActivity: string;
    fanActivity: string;
    lightingStatus: string;
    lightingCondition: string;
  };
  currentGrayscale: number[];
} => {
  // Create an offscreen canvas for analysis
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    return {
      environmental: {
        brightnessLevel: 50,
        illuminationScore: 50,
        motionActivity: "None",
        fanActivity: "Not Detected",
        lightingStatus: "Likely OFF",
        lightingCondition: "Dark Room Detected"
      },
      currentGrayscale: []
    };
  }

  try {
    // Draw current video frame (resized to 32x24 for performance and noise reduction)
    ctx.drawImage(video, 0, 0, 32, 24);
    const imgData = ctx.getImageData(0, 0, 32, 24);
    const data = imgData.data;

    let totalBrightness = 0;
    const currentGrayscale: number[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      currentGrayscale.push(Math.round(brightness));
    }

    const numPixels = 32 * 24;
    const avgBrightnessRaw = totalBrightness / numPixels;
    const brightnessLevel = Math.round((avgBrightnessRaw / 255) * 100);
    const illuminationScore = brightnessLevel;

    // Determine lighting status and condition
    const lightingStatus = brightnessLevel >= 35 ? "Likely ON" : "Likely OFF";
    let lightingCondition = "Dark Room Detected";
    if (brightnessLevel >= 60) {
      lightingCondition = "Bright Room Detected";
    } else if (brightnessLevel >= 15) {
      lightingCondition = "Dim Room Detected";
    }

    // Motion and Fan Analysis
    let motionActivity = "None";
    let fanActivity = "Not Detected";
    let motionPercent = 0;

    if (prevGrayscale && prevGrayscale.length === currentGrayscale.length) {
      let movingPixels = 0;
      const cellWidth = 4;
      const cellHeight = 4;
      const gridCols = 8;
      const gridRows = 6;
      
      // Track motion in each cell
      const cellMotion: boolean[] = new Array(gridCols * gridRows).fill(false);
      const cellDiffs: number[] = new Array(gridCols * gridRows).fill(0);

      for (let cy = 0; cy < gridRows; cy++) {
        for (let cx = 0; cx < gridCols; cx++) {
          let cellDiffSum = 0;
          let cellMovingCount = 0;

          for (let dy = 0; dy < cellHeight; dy++) {
            for (let dx = 0; dx < cellWidth; dx++) {
              const px = cx * cellWidth + dx;
              const py = cy * cellHeight + dy;
              const idx = py * 32 + px;
              const diff = Math.abs(currentGrayscale[idx] - prevGrayscale[idx]);
              
              cellDiffSum += diff;
              if (diff > 18) { // Noise threshold
                movingPixels++;
                cellMovingCount++;
              }
            }
          }

          const cellIdx = cy * gridCols + cx;
          cellDiffs[cellIdx] = cellDiffSum / (cellWidth * cellHeight);
          // If > 20% of pixels in this cell are moving, mark cell as moving
          if (cellMovingCount > (cellWidth * cellHeight) * 0.20) {
            cellMotion[cellIdx] = true;
          }
        }
      }

      motionPercent = (movingPixels / numPixels) * 100;
      if (motionPercent > 18) {
        motionActivity = "High";
      } else if (motionPercent > 5) {
        motionActivity = "Medium";
      } else if (motionPercent > 0.5) {
        motionActivity = "Low";
      }

      // Localized high-frequency motion in upper 60% of screen (rows 0 to 3)
      let potentialFanCells = 0;
      let otherMovingCells = 0;

      for (let cy = 0; cy < gridRows; cy++) {
        for (let cx = 0; cx < gridCols; cx++) {
          const cellIdx = cy * gridCols + cx;
          if (cellMotion[cellIdx]) {
            if (cy <= 3 && cellDiffs[cellIdx] > 22) {
              potentialFanCells++;
            } else {
              otherMovingCells++;
            }
          }
        }
      }

      // Fan is characterized by localized upper motion (e.g. 1-3 cells moving)
      // while the rest of the room doesn't have major motion.
      if (potentialFanCells >= 1 && potentialFanCells <= 3 && otherMovingCells <= 4) {
        fanActivity = "Detected";
      }
    }

    return {
      environmental: {
        brightnessLevel,
        illuminationScore,
        motionActivity,
        fanActivity,
        lightingStatus,
        lightingCondition
      },
      currentGrayscale
    };
  } catch (err) {
    console.error("[WebcamCapture] Offscreen canvas analysis failure:", err);
    return {
      environmental: {
        brightnessLevel: 50,
        illuminationScore: 50,
        motionActivity: "None",
        fanActivity: "Not Detected",
        lightingStatus: "Likely OFF",
        lightingCondition: "Dark Room Detected"
      },
      currentGrayscale: []
    };
  }
};

export function WebcamCapture({ onFrameCapture, isProcessing = false, intervalMs = 2000 }: WebcamCaptureProps) {
  const { videoRef, isActive, error, startStream, stopStream, captureFrame } = useWebcam({
    width: 640,
    height: 480,
  });

  const [blazeModel, setBlazeModel] = useState<any>(null);
  const [cocoModel, setCocoModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const prevGrayscaleRef = useRef<number[] | null>(null);

  // Load TensorFlow.js, BlazeFace, and COCO-SSD models
  useEffect(() => {
    let isMounted = true;
    async function initAI() {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd");
        
        if (isMounted) {
          console.log("[WebcamCapture] TensorFlow scripts loaded. Loading models...");
          const loadedBlaze = await (window as any).blazeface.load();
          const loadedCoco = await (window as any).cocoSsd.load();
          
          setBlazeModel(loadedBlaze);
          setCocoModel(loadedCoco);
          setIsModelLoading(false);
          console.log("[WebcamCapture] BlazeFace and COCO-SSD models loaded successfully.");
        }
      } catch (err) {
        console.error("[WebcamCapture] Failed to load detection models:", err);
      }
    }
    initAI();
    return () => {
      isMounted = false;
    };
  }, []);

  const intervalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Auto-start stream on component mount
  useEffect(() => {
    startStream();
    return () => {
      stopStream();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      prevGrayscaleRef.current = null;
    };
  }, [startStream, stopStream]);

  // Handle frame capturing interval (dynamic configurable duration)
  useEffect(() => {
    if (isActive && onFrameCapture) {
      // Clear existing interval if any
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(async () => {
        const frame = captureFrame();
        if (frame) {
          let detectedObjects: Array<{ label: string; confidence: number }> = [];
          let environmentalData = undefined;

          if (videoRef.current) {
            try {
              // 1. Run BlazeFace (Face detection -> Person presence)
              let faceDetections: Array<{ label: string; confidence: number }> = [];
              if (blazeModel) {
                const predictions = await blazeModel.estimateFaces(videoRef.current, false);
                if (predictions && predictions.length > 0) {
                  faceDetections = predictions.map((pred: any) => ({
                    label: "person",
                    confidence: pred.probability ? pred.probability[0] : 0.95,
                  }));
                }
              }

              // 2. Run COCO-SSD (Multi-object detection)
              let objectDetections: Array<{ label: string; confidence: number }> = [];
              if (cocoModel) {
                const predictions = await cocoModel.detect(videoRef.current);
                if (predictions && predictions.length > 0) {
                  objectDetections = predictions.map((pred: any) => ({
                    label: pred.class,
                    confidence: pred.score,
                  }));
                }
              }

              // 3. Merge detections in a unified map
              const mergedMap = new Map<string, number>();

              // Add face detections
              faceDetections.forEach(det => {
                const existing = mergedMap.get(det.label) || 0;
                if (det.confidence > existing) {
                  mergedMap.set(det.label, det.confidence);
                }
              });

              // Add coco detections
              objectDetections.forEach(det => {
                const existing = mergedMap.get(det.label) || 0;
                if (det.confidence > existing) {
                  mergedMap.set(det.label, det.confidence);
                }
              });

              // Convert back to array
              mergedMap.forEach((conf, label) => {
                detectedObjects.push({ label, confidence: conf });
              });

              // 4. Run Offscreen Video Pixel Analysis
              const analysis = analyzeVideoFrame(videoRef.current, prevGrayscaleRef.current);
              prevGrayscaleRef.current = analysis.currentGrayscale;
              environmentalData = analysis.environmental;

            } catch (err) {
              console.error("[WebcamCapture] Object/face/pixel estimation error:", err);
            }
          }
          onFrameCapture(frame, detectedObjects, environmentalData);
        }
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      prevGrayscaleRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onFrameCapture, captureFrame, intervalMs, blazeModel, cocoModel]);

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full overflow-hidden border rounded-2xl bg-zinc-950 border-zinc-800/80 backdrop-blur-xl">
      {/* High-tech overlay header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {isActive ? "LIVE FEED" : "FEED OFFLINE"}
            </span>
          </div>
          {isActive && (
            <div className="hidden lg:flex items-center gap-3 text-[9px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${blazeModel ? "bg-emerald-500" : "bg-zinc-600 animate-pulse"}`} />
                BlazeFace: {blazeModel ? "ACTIVE" : "LOADING"}
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${cocoModel ? "bg-emerald-500" : "bg-zinc-600 animate-pulse"}`} />
                COCO-SSD: {cocoModel ? "ACTIVE" : "LOADING"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={isActive ? stopStream : startStream}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isActive
              ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {isActive ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              DISCONNECT
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              CONNECT
            </>
          )}
        </button>
      </div>

      {/* Video stream container */}
      <div className="relative flex-1 flex items-center justify-center min-h-[320px] bg-zinc-950">
        {isActive ? (
          <div className={`relative w-full h-full ${isFullscreen ? "" : "max-h-[480px]"}`}>
            {/* Mirror video for standard webcam orientation */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Scanning Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-40" />

            {/* Radar scan grid effect */}
            {isProcessing && (
              <div className="absolute inset-0 pointer-events-none border-t border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent animate-scan" />
            )}

            {/* Technical HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
              {/* Corner crop marks */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-zinc-400/60" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-zinc-400/60" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-zinc-400/60" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-zinc-400/60" />

              {/* Status information */}
              <div className="flex items-start justify-end w-full">
                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="pointer-events-auto flex items-center justify-center p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-850 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all shadow-md cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                  </svg>
                </button>
              </div>

              {/* Bounding box mock indicator for visual aesthetics */}
              {isProcessing && (
                <div className="absolute top-1/3 left-1/3 w-32 h-32 border-2 border-dashed border-emerald-500/70 rounded flex flex-col justify-between p-1 select-none animate-pulse">
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/85 px-1 py-0.5 rounded self-start">
                    SCANNING...
                  </span>
                </div>
              )}

              <div className="flex items-end justify-end w-full">
                {isProcessing && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    SENDING FRAMES
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">Webcam Offline</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Connect to your local video feed to begin operations monitoring and edge frame sampling.
            </p>
            {error && <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg mb-4">{error}</p>}
            <button
              onClick={startStream}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs rounded-xl shadow-md transition-colors"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
