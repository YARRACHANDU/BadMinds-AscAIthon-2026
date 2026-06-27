"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WebcamCapture } from "../components/WebcamCapture";
import { RoomState, AlertItem, ActionLog } from "../lib/types";

export default function Home() {
  const [roomState, setRoomState] = useState<RoomState>({
    locationId: "NODE_01",
    locationName: "Main Office / Lab",
    peopleCount: 0,
    detectedObjects: [], // Removed initial mock objects
    roomStatus: "Empty",
    safetyStatus: "Secure",
    lastUpdated: "",
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [systemDate, setSystemDate] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize client-only states to prevent SSR hydration mismatches
  useEffect(() => {
    setSystemDate(new Date().toLocaleDateString());
    setRoomState((prev) => ({
      ...prev,
      lastUpdated: new Date().toLocaleTimeString(),
    }));
    setAlerts([]); // Removed dummy alerts on start
    setLogs([
      {
        id: "init",
        type: "system",
        message: "SentinelAI Operations Engine initialized and ready.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);


  const [isProcessing, setIsProcessing] = useState(false);
  const [smartControlState, setSmartControlState] = useState({
    smartLight: true,
    smartAC: true,
    alarmSystem: false,
  });

  const [simulationMode, setSimulationMode] = useState<"webcam" | "demo">("webcam");
  const [apiKey, setApiKey] = useState("");
  const [frameCount, setFrameCount] = useState(0);
  const [rawResponse, setRawResponse] = useState<any>(null);
  
  // Load default interval from environment variables or fallback to 2000ms
  const [sampleInterval, setSampleInterval] = useState(() => {
    const envVal = process.env.NEXT_PUBLIC_DEFAULT_SAMPLING_INTERVAL;
    return envVal ? Number(envVal) : 2000;
  });

  // Add system logs helper
  const addLog = useCallback((type: ActionLog["type"], message: string, details?: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        details,
      },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  }, []);

  // Helper to send actuation commands to the backend
  const sendActuation = useCallback(async (commandType: string, parameters: any, field: "smartLight" | "smartAC" | "alarmSystem", nextVal: boolean) => {
    setSmartControlState((prev) => ({ ...prev, [field]: nextVal }));

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:2005";
      const response = await fetch(`${backendUrl}/api/actuate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetNodeId: "NODE_01",
          commandType,
          parameters,
        }),
      });
      const data = await response.json();
      console.log(`[Actuator Response for ${commandType}]`, data);
      
      addLog("automation", `Actuation command sent: ${commandType} (${nextVal ? "ON" : "OFF"}).`);
    } catch (err) {
      console.warn("Actuation API call failed. Operating in offline simulation mode.", err);
    }
  }, [addLog]);

  // Frame Capture Handler (called dynamically from WebcamCapture)
  const handleFrameCapture = useCallback(
    async (base64Image: string) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setFrameCount((prev) => prev + 1);

      const timestamp = new Date().toLocaleTimeString();
      // Console capture log and UI Toast alert
      console.log(`[SentinelAI] Image captured successfully at ${timestamp}. Payload length: ${base64Image.length} characters.`);
      setToastMessage(`Frame captured at ${timestamp}`);
      
      // Auto-clear toast alert after 1s
      setTimeout(() => {
        setToastMessage((curr) => curr && curr.startsWith("Frame captured") ? null : curr);
      }, 1000);

      // Simple POST request to send the frame to the backend server (First step integration)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:2005";
      fetch(`${backendUrl}/api/perceive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, simulationMode })
      })
      .then(res => res.json())
      .then(data => {
        console.log("[Backend Ingest Response]", data);
        setRawResponse(data);
        if (data.success && data.roomState) {
          setRoomState(data.roomState);
        }
      })
      .catch(err => console.warn("Backend server not responding for frame ingest.", err));
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Generate dynamic scenarios for demo/simulation aesthetics
        const rand = Math.random();
        let newPeopleCount = roomState.peopleCount;
        let newObjects = [...roomState.detectedObjects];
        let newRoomStatus = roomState.roomStatus;
        let newSafetyStatus = roomState.safetyStatus;

        if (simulationMode === "demo") {
          // In demo mode, simulate changing situations
          if (frameCount % 4 === 0) {
            newPeopleCount = Math.floor(Math.random() * 3);
            if (newPeopleCount > 0) {
              newRoomStatus = "Active";
              if (!newObjects.includes("Person")) newObjects.push("Person");
            } else {
              newRoomStatus = "Empty";
              newObjects = newObjects.filter((o) => o !== "Person");
            }
          }
        } else {
          // Webcam Mode - Simulate detection based on active webcam
          if (rand > 0.8) {
            newPeopleCount = newPeopleCount === 0 ? 1 : 0;
            if (newPeopleCount > 0) {
              newRoomStatus = "Active";
              if (!newObjects.includes("Person")) newObjects.push("Person");
              addLog("automation", "Detected human presence via Node_01 camera feed.");
            } else {
              newRoomStatus = "Empty";
              newObjects = newObjects.filter((o) => o !== "Person");
              addLog("system", "Room returned to unoccupied status.");
            }
          }
        }

        // AI Decision Engine Rules Simulation
        if (newPeopleCount === 0 && smartControlState.smartLight && rand > 0.7) {
          setSmartControlState((prev) => ({ ...prev, smartLight: false }));
          addLog("automation", "AI Action: Smart Light switched OFF automatically due to empty room.", "Energy saver protocol engaged.");
          
          setAlerts((prev) =>
            prev.map((a) => (a.category === "energy" ? { ...a, resolved: true } : a))
          );
        } else if (newPeopleCount > 0 && !smartControlState.smartLight) {
          setSmartControlState((prev) => ({ ...prev, smartLight: true }));
          addLog("automation", "AI Action: Smart Light switched ON automatically (Occupancy detected).");
        }

        // Safety breach simulator
        if (newPeopleCount > 0 && rand > 0.9 && !newObjects.includes("Unidentified Object")) {
          newObjects.push("Unidentified Object");
          newSafetyStatus = "Warning";
          const newAlert: AlertItem = {
            id: Math.random().toString(),
            title: "Safety Warning: Unidentified Object",
            description: "An object blocking the emergency exit has been detected.",
            category: "safety",
            severity: "warning",
            timestamp: new Date().toLocaleTimeString(),
            resolved: false,
          };
          setAlerts((prev) => [newAlert, ...prev]);
          addLog("alert", "Safety Warning: Object blocking emergency exit detected.");
        }

        // Output Simulated Afferens API Response to Console
        const perceptionResponse = {
          status: "success",
          timestamp: new Date().toISOString(),
          data: {
            peopleCount: newPeopleCount,
            detectedObjects: newObjects,
            roomStatus: newRoomStatus,
            safetyStatus: newSafetyStatus,
          }
        };
        console.log("[Afferens API Perception Result]", perceptionResponse);

        setRoomState({
          locationId: "NODE_01",
          locationName: "Main Office / Lab",
          peopleCount: newPeopleCount,
          detectedObjects: newObjects,
          roomStatus: newRoomStatus,
          safetyStatus: newSafetyStatus,
          lastUpdated: new Date().toLocaleTimeString(),
        });

      } catch (err) {
        console.error(err);
        addLog("system", "Perception API Error: Failed to process frame.");
      } finally {
        setIsProcessing(false);
      }
    },
    [roomState, isProcessing, simulationMode, frameCount, smartControlState, addLog]
  );

  // Dynamic Eco Savings calculation based on device control states
  const activeDeviceCount = [
    smartControlState.smartLight,
    smartControlState.smartAC,
    smartControlState.alarmSystem
  ].filter(Boolean).length;
  const ecoSavings = Math.round(((3 - activeDeviceCount) / 3) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      {/* Visual Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-500/90 border border-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md text-[11px] flex items-center gap-1.5 animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
          {toastMessage}
        </div>
      )}
      {/* Top Header Panel */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-5 h-5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SentinelAI <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">v1.0.0</span>
            </h1>
            <p className="text-xs text-zinc-500">Physical AI Agent Operations Manager</p>
          </div>
        </div>

        {/* Global Connection Settings & Timing */}
        <div className="flex flex-wrap items-center gap-4 mt-3 md:mt-0">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setSimulationMode("webcam")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                simulationMode === "webcam" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Live Camera
            </button>
            <button
              onClick={() => setSimulationMode("demo")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                simulationMode === "demo" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Demo Simulator
            </button>
          </div>

          {/* Sampling Rate Control */}
          <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <span className="text-[9px] font-mono uppercase text-zinc-400 px-1">Rate:</span>
            <select
              value={sampleInterval}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSampleInterval(val);
                addLog("system", `Edge sampling rate adjusted to ${val / 1000}s.`);
              }}
              className="bg-zinc-850 text-emerald-400 border-none outline-none text-xs rounded-lg px-2 py-0.5 font-medium cursor-pointer"
            >
              <option value={2000}>2s (Realtime)</option>
              <option value={4000}>4s (Standard)</option>
              <option value={8000}>8s (Eco Mode)</option>
            </select>
          </div>

          {/* Settings / API Key */}
          <div className="relative">
            <input
              type="password"
              placeholder="Afferens API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 w-44 placeholder-zinc-600"
            />
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">System Time</span>
            <span className="text-xs font-medium text-zinc-300">{systemDate || "--/--/----"}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Video & State Monitoring (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Live Feed Component */}
          <div className="h-[400px] flex-shrink-0">
            <WebcamCapture 
              onFrameCapture={handleFrameCapture} 
              isProcessing={isProcessing} 
              intervalMs={sampleInterval}
            />
          </div>

          {/* Environment State Monitor Card */}
          <div className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3">
              <h3 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Digital Environment State
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">LAST SYNC: {roomState.lastUpdated}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {/* People Count Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Occupancy</span>
                <p className="text-2xl font-bold text-white mt-1">{roomState.peopleCount}</p>
                <span className="text-[9px] text-zinc-500">{roomState.peopleCount === 1 ? "Person" : "People"} Present</span>
              </div>

              {/* Room Status */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Status</span>
                <div className="mt-2.5">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    roomState.roomStatus === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800/60 text-zinc-400"
                  }`}>
                    {roomState.roomStatus}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 block mt-2.5">Activity State</span>
              </div>

              {/* Safety Status */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Safety</span>
                <div className="mt-2.5">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    roomState.safetyStatus === "Secure" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {roomState.safetyStatus}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 block mt-2.5">Safety Index</span>
              </div>

              {/* Energy Savings */}
              <div className="bg-zinc-900/40 border border-zinc-800/40 p-3.5 rounded-xl text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Eco Saving</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{ecoSavings}%</p>
                <span className="text-[9px] text-zinc-500">Device Optimization</span>
              </div>
            </div>

            {/* Active Objects List */}
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2">Detected Objects</span>
              <div className="flex flex-wrap gap-2">
                {roomState.detectedObjects.map((obj, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-300 hover:border-zinc-700 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    {obj}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </section>

        {/* Right Side: Raw JSON Response Inspector (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">

          {/* Raw Response Payload Card */}
          <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col min-h-[450px]">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase mb-4 border-b border-zinc-800/60 pb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Raw API Response Payload
            </h3>
            
            <div className="flex-1 overflow-auto bg-black/60 rounded-xl p-4 border border-zinc-800/60 font-mono text-[11px] text-emerald-400 max-h-[500px]">
              {rawResponse ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(rawResponse, null, 2)}</pre>
              ) : (
                <span className="text-zinc-500 italic">Awaiting first frame capture ingestion payload...</span>
              )}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
