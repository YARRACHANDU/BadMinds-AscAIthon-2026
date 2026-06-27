"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebcam } from "../hooks/useWebcam";

interface WebcamCaptureProps {
  onFrameCapture?: (base64Image: string) => void;
  isProcessing?: boolean;
  intervalMs?: number; // Configurable sampling interval
}

export function WebcamCapture({ onFrameCapture, isProcessing = false, intervalMs = 2000 }: WebcamCaptureProps) {
  const { videoRef, isActive, error, startStream, stopStream, captureFrame } = useWebcam({
    width: 640,
    height: 480,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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
    };
  }, [startStream, stopStream]);

  // Handle frame capturing interval (dynamic configurable duration)
  useEffect(() => {
    if (isActive && onFrameCapture) {
      // Clear existing interval if any
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) {
          onFrameCapture(frame);
        }
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onFrameCapture, captureFrame, intervalMs]);

  return (
    <div ref={containerRef} className="relative flex flex-col w-full h-full overflow-hidden border rounded-2xl bg-zinc-950 border-zinc-800/80 backdrop-blur-xl">
      {/* High-tech overlay header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {isActive ? "LIVE FEED: NODE_01" : "FEED OFFLINE"}
          </span>
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
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col bg-zinc-950/80 px-2 py-1 rounded border border-zinc-800/80 text-[10px] font-mono text-zinc-400">
                  <span>RES: 640x480</span>
                  <span>FPS: 30.00</span>
                </div>
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
                <div className="flex flex-col bg-zinc-950/80 px-2 py-1 rounded border border-zinc-800/80 text-[10px] font-mono text-zinc-400 text-right">
                  <span>LATENCY: ~150ms</span>
                  <span>EDGE_SAMPLING: ACTIVE</span>
                </div>
              </div>

              {/* Bounding box mock indicator for visual aesthetics */}
              {isProcessing && (
                <div className="absolute top-1/3 left-1/3 w-32 h-32 border-2 border-dashed border-emerald-500/70 rounded flex flex-col justify-between p-1 select-none animate-pulse">
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/85 px-1 py-0.5 rounded self-start">
                    SCANNING...
                  </span>
                </div>
              )}

              <div className="flex items-end justify-between w-full">
                <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800/40">
                  REC // {new Date().toISOString().split("T")[0]}
                </div>
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
