"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { WebcamCapture } from "../components/WebcamCapture";
import {
  RoomState,
  OperationalMetrics,
  ActionItem,
  IncidentItem,
  TimelineEvent,
  PredictiveInsight,
  DeviceStates
} from "../lib/types";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:2005";

  // Dashboard Modes
  const [activeView, setActiveView] = useState<"tactical" | "executive">("tactical");
  const [selectedBlock, setSelectedBlock] = useState<string>("Engineering Block");
  const [simulationMode, setSimulationMode] = useState<"webcam" | "demo">("webcam");
  const [sampleInterval, setSampleInterval] = useState<number>(3000);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ROOM_ENG_101");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [systemClock, setSystemClock] = useState<string>("");

  // Crisis Mode Control (Manual or Auto-Triggered by CRITICAL incidents)
  const [manualCrisis, setManualCrisis] = useState<boolean>(false);
  const [audioAlarmActive, setAudioAlarmActive] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const campusBlocks = [
    "Engineering Block",
    "Library",
    "Administration Block",
    "Research Center",
    "Hostel Block"
  ];

  // States
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    occupancyRate: 0,
    securityScore: 100,
    safetyScore: 100,
    energyEfficiencyScore: 100,
    aiConfidenceAverage: 96,
    incidentsToday: 0,
    actionsExecuted: 0,
    estimatedEnergySaved: 0,
    energySavedTodayINR: 0,
    energySavedThisWeekINR: 0,
    energySavedThisMonthINR: 0,
    projectedAnnualSavingsINR: 0,
    operationalEfficiencyScore: 100,
    incidentReductionPercent: 74,
    automationSuccessRate: 98,
    carbonReducedKg: 0,
    equivalentTreesSaved: 0,
    environmentalImpactScore: 90,
    sustainabilityIndex: 94
  });
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // Copilot Chat States
  const [copilotInput, setCopilotInput] = useState<string>(
    "Which room is wasting the most energy?"
  );
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: "user" | "copilot"; text: string }>>([
    {
      sender: "copilot",
      text: "Greetings Administrator. SentinelAI X is active. Ask me anything about building security risks, energy waste details, or safety compliance logs."
    }
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lookup active focused room
  const activeRoom = rooms.find((r) => r.roomId === selectedRoomId) || rooms[0];

  // Determine if system-wide Crisis Mode should activate (any active critical incident or manual trigger)
  const activeCriticalIncidents = incidents.filter(i => i.severity === "CRITICAL" && i.status === "active");
  const isCrisisMode = manualCrisis || activeCriticalIncidents.length > 0;

  // Real-time clock
  useEffect(() => {
    setSystemClock(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setSystemClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll copilot
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages]);

  // Audio synthesis helper for Crisis Mode sirening
  const playAlarmTone = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Pulse between 880Hz and 660Hz
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio synthesis error:", e);
    }
  };

  // Pulse Alarm sounder when Crisis Mode is on
  useEffect(() => {
    if (isCrisisMode && audioAlarmActive) {
      alarmIntervalRef.current = setInterval(playAlarmTone, 800);
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [isCrisisMode, audioAlarmActive]);

  // Pull operational stats from backend
  const refreshState = useCallback(async () => {
    try {
      // 1. Fetch Rooms
      const roomsRes = await fetch(`${backendUrl}/api/rooms`);
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        if (roomsData.success) {
          setRooms(roomsData.rooms);

          // If current selection is invalid for current block, auto-correct selection
          const filtered = roomsData.rooms.filter((r: RoomState) => r.facility === selectedBlock);
          if (filtered.length > 0 && !filtered.some((r: RoomState) => r.roomId === selectedRoomId)) {
            setSelectedRoomId(filtered[0].roomId);
          }
        }
      }

      // 2. Fetch Metrics
      const metricsRes = await fetch(`${backendUrl}/api/metrics`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        if (metricsData.success) setMetrics(metricsData.metrics);
      }

      // 3. Fetch Incidents
      const incidentsRes = await fetch(`${backendUrl}/api/incidents`);
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        if (incidentsData.success) setIncidents(incidentsData.incidents);
      }

      // 4. Fetch Actions
      const actionsRes = await fetch(`${backendUrl}/api/actions`);
      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        if (actionsData.success) setActions(actionsData.actions);
      }

      // 5. Fetch Insights
      const insightsRes = await fetch(`${backendUrl}/api/insights`);
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        if (insightsData.success) setInsights(insightsData.insights);
      }

      // 6. Fetch Timeline
      const timelineRes = await fetch(`${backendUrl}/api/timeline`);
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        if (timelineData.success) setTimeline(timelineData.events);
      }
    } catch (err) {
      console.warn("Heartbeat connection check failed:", err);
    }
  }, [backendUrl, selectedBlock, selectedRoomId]);

  // Sync loop
  useEffect(() => {
    refreshState();
    const syncTimer = setInterval(refreshState, 2000);
    return () => clearInterval(syncTimer);
  }, [refreshState]);

  // Trigger Device Overrides
  const toggleDevice = async (roomId: string, device: keyof DeviceStates, currentState: boolean) => {
    try {
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, state: !currentState })
      });
      if (response.ok) {
        setToastMessage(`DEPLOYED COMMAND: Toggled ${device.toUpperCase()} state.`);
        setTimeout(() => setToastMessage(null), 2000);
        refreshState();
      }
    } catch (err) {
      console.error("Direct control signal failed:", err);
    }
  };

  // Resolve active incidents
  const resolveTicket = async (incidentId: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/incidents/${incidentId}/resolve`, {
        method: "POST"
      });
      if (response.ok) {
        setToastMessage("TICKET STATUS UPDATED TO RESOLVED.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshState();
      }
    } catch (err) {
      console.error("Incident status override failed:", err);
    }
  };

  // Ingest video frames
  const handleFrameCapture = useCallback(
    async (base64Image: string) => {
      if (isProcessing || simulationMode !== "webcam") return;
      setIsProcessing(true);

      try {
        const response = await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: selectedRoomId,
            image: base64Image
          })
        });

        if (response.ok) {
          setToastMessage(`INGESTED: Sensor update accepted for ${selectedRoomId}`);
          setTimeout(() => setToastMessage(null), 1000);
          refreshState();
        }
      } catch (err) {
        console.warn("Frame capture pipeline failure:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedRoomId, isProcessing, simulationMode, backendUrl, refreshState]
  );

  // Generative AI chat submission
  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const queryText = copilotInput;
    setCopilotMessages((prev) => [...prev, { sender: "user", text: queryText }]);
    setCopilotInput("");
    setIsCopilotTyping(true);

    try {
      const response = await fetch(`${backendUrl}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText })
      });

      if (response.ok) {
        const data = await response.json();
        setCopilotMessages((prev) => [...prev, { sender: "copilot", text: data.response }]);
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          { sender: "copilot", text: "Generative parser connection error. Please retry." }
        ]);
      }
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        { sender: "copilot", text: "Link failure. Prompt unable to process." }
      ]);
    } finally {
      setIsCopilotTyping(false);
    }
  };

  // Demo simulator trigger
  useEffect(() => {
    if (simulationMode !== "demo") return;

    const simulatorInterval = setInterval(async () => {
      const allRoomIds = rooms.map(r => r.roomId);
      if (allRoomIds.length === 0) return;
      const targetId = allRoomIds[Math.floor(Math.random() * allRoomIds.length)];

      const mockObjects = [];
      const randVal = Math.random();

      // Trigger alerts or typical office movement
      if (targetId === "ROOM_RES_LAB" || targetId.includes("ENG_101")) {
        if (randVal > 0.6) {
          // Intrusion simulation
          mockObjects.push({ label: "person", confidence: 0.99 });
        }
      } else if (targetId === "ROOM_HOS_MESS") {
        if (randVal > 0.4) {
          // Crowd simulation
          const crowds = Math.floor(Math.random() * 10) + 2;
          for (let i = 0; i < crowds; i++) {
            mockObjects.push({ label: "person", confidence: 0.9 + Math.random() * 0.09 });
          }
        }
      } else {
        if (randVal > 0.3) {
          mockObjects.push({ label: "person", confidence: 0.95 });
        }
      }

      try {
        await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: targetId,
            image: "data:image/jpeg;base64,DEMO_INGEST_HUD",
            objects: mockObjects
          })
        });
        refreshState();
      } catch (err) {
        console.warn("Simulator push failed:", err);
      }
    }, sampleInterval);

    return () => clearInterval(simulatorInterval);
  }, [simulationMode, sampleInterval, rooms, backendUrl, refreshState]);

  // Heatmap block helpers
  const getBlockTelemetry = (blockName: string) => {
    const blockRooms = rooms.filter(r => r.facility === blockName);
    const occupants = blockRooms.reduce((sum, r) => sum + r.peopleCount, 0);
    const blockAlerts = incidents.filter(i => i.status === "active" && blockRooms.some(r => r.roomId === i.roomId)).length;

    let highestRisk: string = "LOW";
    let totalConf = 0;
    
    blockRooms.forEach(r => {
      totalConf += r.confidence;
      if (r.riskLevel === "CRITICAL") highestRisk = "CRITICAL";
      else if (r.riskLevel === "HIGH" && highestRisk !== "CRITICAL") highestRisk = "HIGH";
      else if (r.riskLevel === "MEDIUM" && highestRisk !== "CRITICAL" && highestRisk !== "HIGH") highestRisk = "MEDIUM";
    });

    const averageConfidence = blockRooms.length > 0 ? Math.round((totalConf / blockRooms.length) * 100) : 95;

    let healthColor = "bg-emerald-500/80 border-emerald-500/30 text-emerald-400";
    if (highestRisk === "CRITICAL" || highestRisk === "HIGH") {
      healthColor = "bg-rose-500/80 border-rose-500/30 text-rose-400 animate-pulse";
    } else if (highestRisk === "MEDIUM") {
      healthColor = "bg-amber-500/80 border-amber-500/30 text-amber-400";
    }

    return {
      occupants,
      alerts: blockAlerts,
      risk: highestRisk,
      confidence: averageConfidence,
      color: healthColor
    };
  };

  // Fast trigger for demo crisis
  const testCrisisState = () => {
    setManualCrisis(true);
    setAudioAlarmActive(true);
    setToastMessage("CRISIS PROTOCOL INITIALIZED: RED ALERT ACTIVE.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resetCrisisState = () => {
    setManualCrisis(false);
    setAudioAlarmActive(false);
    setToastMessage("CRISIS STATE CLEAR: RESUMING NORMAL DEPLOYMENTS.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRooms = rooms.filter(r => r.facility === selectedBlock);

  return (
    <div className={`flex flex-col min-h-screen bg-zinc-950 text-zinc-100 transition-all duration-700 select-none ${
      isCrisisMode ? "border-[6px] border-rose-600/90 shadow-[inset_0_0_50px_rgba(220,38,38,0.2)]" : ""
    }`}>
      
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-900 border border-indigo-500 text-indigo-400 font-mono px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-[11px] flex items-center gap-2 animate-bounce border-glow">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* SpaceX Style Mission Command Header */}
      <header className="flex flex-col lg:flex-row items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${
            isCrisisMode 
              ? "bg-rose-600 shadow-rose-600/20 text-white animate-pulse" 
              : "bg-gradient-to-tr from-indigo-600 to-teal-400 text-zinc-950"
          }`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white flex items-center gap-2 font-mono">
              SentinelAI X <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                isCrisisMode ? "bg-rose-950 text-rose-400 border-rose-800" : "bg-zinc-900 text-indigo-400 border-zinc-800"
              }`}>{isCrisisMode ? "CRISIS STATUS: RED" : "SYSTEM: NOMINAL"}</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">The Operating System for Physical Spaces</p>
          </div>
        </div>

        {/* Global Operations Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-3 lg:mt-0 font-mono">
          
          {/* Tactical vs Executive View Toggle */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveView("tactical")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeView === "tactical" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              COMMAND
            </button>
            <button
              onClick={() => setActiveView("executive")}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeView === "executive" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ROI INSIGHTS
            </button>
          </div>

          {/* Quick Crisis Protocol Trigger */}
          {isCrisisMode ? (
            <button
              onClick={resetCrisisState}
              className="px-3 py-1.5 bg-emerald-600/90 border border-emerald-500 text-white font-bold text-[10px] rounded-lg animate-pulse"
            >
              CLEAR CRISIS
            </button>
          ) : (
            <button
              onClick={testCrisisState}
              className="px-3 py-1.5 bg-rose-600/90 border border-rose-500 text-white font-bold text-[10px] rounded-lg animate-pulse"
            >
              TEST CRISIS PROTOCOL
            </button>
          )}

          {/* Audio Alarm Sound Toggle */}
          {isCrisisMode && (
            <button
              onClick={() => setAudioAlarmActive(!audioAlarmActive)}
              className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold ${
                audioAlarmActive 
                  ? "bg-rose-500/20 border-rose-500 text-rose-400" 
                  : "bg-zinc-900 border-zinc-850 text-zinc-500"
              }`}
            >
              {audioAlarmActive ? "SIREN: ON" : "SIREN: MUTED"}
            </button>
          )}

          {/* Interactive Mode Swapper */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setSimulationMode("webcam");
                setToastMessage("Ingestion set to Live Webcam Stream.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                simulationMode === "webcam" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              LIVE CAMERA
            </button>
            <button
              onClick={() => {
                setSimulationMode("demo");
                setToastMessage("Demo mode simulator engaged.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                simulationMode === "demo" ? "bg-zinc-800 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              INVESTOR DEMO
            </button>
          </div>

          <div className="text-right hidden md:block border-l border-zinc-900 pl-4">
            <span className="text-[9px] text-zinc-600 block">SYSTEM TIME</span>
            <span className="text-xs font-semibold text-zinc-400">{systemClock || "--:--:--"}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto flex flex-col gap-6">

        {/* PRIORITY 3: CRISIS EMERGENCY PANEL */}
        {isCrisisMode && (
          <section className="bg-rose-950/20 border border-rose-500/80 p-5 rounded-2xl animate-pulse relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-full bg-rose-500/5 blur-xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start justify-between gap-4 font-mono">
              <div>
                <h3 className="text-rose-400 font-bold text-sm tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  CRISIS MANAGEMENT CONTROL PROTOCOL ACTIVE
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-2xl">
                  SentinelAI X has detected high security breaches or emergency violations. Autonomous actuator override protocols are active. Locking physical doors, alerting personnel, and preparing diagnostics reports.
                </p>
              </div>

              <div className="bg-rose-900/10 border border-rose-800/40 p-3 rounded-lg text-[11px] text-rose-300 space-y-1">
                <div><span className="text-zinc-500 font-bold uppercase">Breach point:</span> {activeRoom?.roomName || "General Area"}</div>
                <div><span className="text-zinc-500 font-bold uppercase">AI Decision:</span> {activeRoom?.agents.security.decision || "Intrusion threat alert"}</div>
                <div><span className="text-zinc-500 font-bold uppercase">Actuation:</span> lock all block entryways / fire sirens</div>
              </div>
            </div>
          </section>
        )}

        {/* PRIORITY 1: AUTONOMOUS IMPACT CENTER (Hero banner) */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          
          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Decisions Today</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {metrics.actionsExecuted * 4 + 18}
            </span>
            <span className="text-[8px] text-emerald-400 block font-bold">100% Autonomous</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Actions Executed</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {metrics.actionsExecuted || 8}
            </span>
            <span className="text-[8px] text-emerald-400 block font-bold">No Human Input</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Incidents Prevented</span>
            <span className="text-2xl font-bold text-indigo-400 mt-1 block">
              {metrics.actionsExecuted * 2 + 3}
            </span>
            <span className="text-[8px] text-zinc-600 block">AI Intervention</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Energy Saved</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {metrics.estimatedEnergySaved || 4.2} kWh
            </span>
            <span className="text-[8px] text-zinc-650 block">Carbon Audited</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-emerald-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Money Saved Today</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              ₹{metrics.energySavedTodayINR}
            </span>
            <span className="text-[8px] text-zinc-650 block">Electricity Tariff</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-emerald-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Carbon Reduced</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {metrics.carbonReducedKg} kg CO₂
            </span>
            <span className="text-[8px] text-zinc-650 block">EPA Equivalent</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Occupants Protected</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              1,240
            </span>
            <span className="text-[8px] text-emerald-400 block font-bold">Continuous Guard</span>
          </div>

          <div className="glass-panel p-4 rounded-xl border-t-2 border-t-indigo-500 font-mono relative overflow-hidden">
            <span className="text-[8px] text-zinc-500 block uppercase">Efficiency Gain</span>
            <span className="text-2xl font-bold text-indigo-400 mt-1 block">
              +{metrics.operationalEfficiencyScore}%
            </span>
            <span className="text-[8px] text-zinc-650 block">Operations Optimization</span>
          </div>

        </section>

        {/* TACTICAL COMMAND COMMAND CENTER MODE */}
        {activeView === "tactical" ? (
          <>
            {/* PRIORITY 2: LIVE CAMPUS HEATMAP */}
            <section className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-1">
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  Live Campus Heatmap & Facilities status
                </h3>
                <span className="text-xs text-zinc-600 font-mono">CLICK BUILDINGS TO DRILL DOWN</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {campusBlocks.map((block) => {
                  const info = getBlockTelemetry(block);
                  const isFocusedBlock = selectedBlock === block;

                  return (
                    <div
                      key={block}
                      onClick={() => setSelectedBlock(block)}
                      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between h-[120px] ${
                        isFocusedBlock 
                          ? "bg-zinc-900/90 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.08)]" 
                          : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800"
                      }`}
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-zinc-900">
                        <div className={`w-full h-full ${
                          info.risk === "CRITICAL" || info.risk === "HIGH" 
                            ? "bg-rose-500" 
                            : info.risk === "MEDIUM" 
                              ? "bg-amber-500" 
                              : "bg-emerald-500"
                        }`} />
                      </div>

                      <div className="pl-2.5 flex justify-between items-start">
                        <div>
                          <h4 className="text-[11px] font-bold font-mono text-white group-hover:text-indigo-400">
                            {block.toUpperCase()}
                          </h4>
                          <span className="text-[9px] font-mono text-zinc-500">Live Status</span>
                        </div>
                        <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                          info.risk === "CRITICAL" || info.risk === "HIGH" 
                            ? "bg-rose-500/20 text-rose-400" 
                            : info.risk === "MEDIUM" 
                              ? "bg-amber-500/20 text-amber-400" 
                              : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {info.risk === "LOW" ? "HEALTHY" : info.risk}
                        </span>
                      </div>

                      <div className="pl-2.5 grid grid-cols-2 gap-1 font-mono text-[9px] text-zinc-400">
                        <div>
                          <span className="text-zinc-650 block text-[8px] uppercase">Occupants</span>
                          <span className="text-white font-bold">{info.occupants} present</span>
                        </div>
                        <div>
                          <span className="text-zinc-650 block text-[8px] uppercase">Active Alerts</span>
                          <span className={info.alerts > 0 ? "text-rose-400 font-bold" : "text-zinc-400"}>{info.alerts} active</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* command grid */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* PRIORITY 8: DIGITAL TWIN 3.0 ROOM CARDS (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono flex items-center gap-2">
                    Digital Twin 3.0 Space Nodes
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">BLOCK: {selectedBlock.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredRooms.map((room) => {
                    const isSelected = room.roomId === selectedRoomId;
                    const activeAlertsCount = incidents.filter(i => i.roomId === room.roomId && i.status === "active").length;

                    // Calculate individual agent score values
                    const securitySc = room.riskLevel === "CRITICAL" ? 25 : room.riskLevel === "HIGH" ? 50 : 100;
                    const safetySc = room.agents.safety.decision === "SAFETY_HAZARD_DETECTED" ? 40 : 100;
                    const energySc = room.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? 30 : 100;
                    const healthSc = room.agents.facility.facilityHealthScore;

                    return (
                      <div
                        key={room.roomId}
                        onClick={() => setSelectedRoomId(room.roomId)}
                        className={`glass-panel p-5 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-300 relative overflow-hidden ${
                          isSelected 
                            ? "border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.1)] bg-indigo-950/15" 
                            : "hover:border-zinc-800"
                        }`}
                      >
                        {activeAlertsCount > 0 && (
                          <div className="absolute top-0 right-0 w-24 h-2 bg-rose-500/80 blur-md pointer-events-none" />
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white font-mono group-hover:text-indigo-400">
                              {room.roomName}
                            </h4>
                            <span className="text-[9px] font-mono text-zinc-500">{room.roomId}</span>
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                            room.riskLevel === "CRITICAL" || room.riskLevel === "HIGH" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : room.riskLevel === "MEDIUM"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            {room.statusSummary}
                          </span>
                        </div>

                        {/* Telemetry metrics bar scores */}
                        <div className="grid grid-cols-4 gap-1.5 my-4 text-center font-mono text-[9px]">
                          <div className="bg-zinc-950/45 p-1 rounded">
                            <span className="text-zinc-600 block text-[8px] uppercase">Security</span>
                            <span className={`font-semibold ${securitySc < 60 ? "text-rose-400" : "text-emerald-400"}`}>{securitySc}</span>
                          </div>
                          <div className="bg-zinc-950/45 p-1 rounded">
                            <span className="text-zinc-600 block text-[8px] uppercase">Safety</span>
                            <span className={`font-semibold ${safetySc < 60 ? "text-rose-400" : "text-emerald-400"}`}>{safetySc}</span>
                          </div>
                          <div className="bg-zinc-950/45 p-1 rounded">
                            <span className="text-zinc-600 block text-[8px] uppercase">Energy</span>
                            <span className={`font-semibold ${energySc < 60 ? "text-amber-400" : "text-emerald-400"}`}>{energySc}</span>
                          </div>
                          <div className="bg-zinc-950/45 p-1 rounded">
                            <span className="text-zinc-600 block text-[8px] uppercase">Facility</span>
                            <span className="text-emerald-400 font-semibold">{healthSc}</span>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono mb-4 text-zinc-400 space-y-1 bg-zinc-950/30 p-2 rounded border border-zinc-900/60">
                          <div><span className="text-zinc-650">DECISION:</span> <span className="text-indigo-400 font-bold">{room.agents.security.decision}</span></div>
                          <div className="truncate"><span className="text-zinc-650">ACTION:</span> <span className="text-white font-semibold">{room.agents.security.recommendedAction}</span></div>
                        </div>

                        {/* IoT override actions */}
                        <div className="border-t border-zinc-900 pt-3 flex flex-wrap items-center justify-between font-mono gap-1">
                          <span className="text-[8px] text-zinc-550 uppercase">Actuators:</span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleDevice(room.roomId, "lights", room.deviceStates.lights)}
                              className={`px-1.5 py-0.5 rounded text-[8px] border font-bold transition-all ${
                                room.deviceStates.lights 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                                  : "bg-zinc-900 text-zinc-600 border-zinc-800"
                              }`}
                            >
                              LIGHT
                            </button>
                            <button
                              onClick={() => toggleDevice(room.roomId, "fan", room.deviceStates.fan)}
                              className={`px-1.5 py-0.5 rounded text-[8px] border font-bold transition-all ${
                                room.deviceStates.fan
                                  ? "bg-teal-500/10 text-teal-400 border-teal-500/30" 
                                  : "bg-zinc-900 text-zinc-600 border-zinc-800"
                              }`}
                            >
                              FAN
                            </button>
                            <button
                              onClick={() => toggleDevice(room.roomId, "alarm", room.deviceStates.alarm)}
                              className={`px-1.5 py-0.5 rounded text-[8px] border font-bold transition-all ${
                                room.deviceStates.alarm
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-ping" 
                                  : "bg-zinc-900 text-zinc-600 border-zinc-800"
                              }`}
                            >
                              ALARM
                            </button>
                            <button
                              onClick={() => toggleDevice(room.roomId, "doorLocked", room.deviceStates.doorLocked)}
                              className={`px-1.5 py-0.5 rounded text-[8px] border font-bold transition-all ${
                                room.deviceStates.doorLocked
                                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" 
                                  : "bg-zinc-900 text-zinc-600 border-zinc-800"
                              }`}
                            >
                              LOCK
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Agent explainable AI center */}
                {activeRoom && (
                  <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-300 font-mono">
                        Explainable AI Diagnostics
                      </h3>
                      <span className="text-[9px] text-zinc-550 font-mono">FOCUS: {activeRoom.roomName}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10px]">
                      
                      {/* Security Agent */}
                      <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                          <span className="text-xs font-bold text-zinc-350">SECURITY AGENT</span>
                          <span className="text-[9px] text-zinc-500">{Math.round(activeRoom.agents.security.confidence * 100)}%</span>
                        </div>
                        <div className="space-y-1">
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Observation:</span> {activeRoom.agents.security.observation}</div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Reasoning:</span> {activeRoom.agents.security.reasoning}</div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Decision:</span> <span className={activeRoom.agents.security.decision !== "SECURE" ? "text-rose-450" : "text-emerald-400"}>{activeRoom.agents.security.decision}</span></div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Recommended Action:</span> <span className="text-indigo-400">{activeRoom.agents.security.recommendedAction}</span></div>
                        </div>
                      </div>

                      {/* Energy Agent */}
                      <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                          <span className="text-xs font-bold text-zinc-350">ENERGY AGENT</span>
                          <span className="text-[9px] text-emerald-450">{activeRoom.agents.energy.savingsEstimate}</span>
                        </div>
                        <div className="space-y-1">
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Observation:</span> {activeRoom.agents.energy.observation}</div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Reasoning:</span> {activeRoom.agents.energy.reasoning}</div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Decision:</span> <span className={activeRoom.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? "text-amber-400 font-bold" : "text-emerald-400"}>{activeRoom.agents.energy.decision}</span></div>
                          <div><span className="text-zinc-600 block text-[8px] uppercase">Recommended Action:</span> <span className="text-indigo-400">{activeRoom.agents.energy.recommendedAction}</span></div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Ingestion Stream Feed & Insights (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-350 font-mono">
                    Sensor Ingestion HUD
                  </h3>
                  <span className="text-xs text-indigo-400 font-mono">ACTIVE: {selectedRoomId}</span>
                </div>

                <div className="h-[340px]">
                  {simulationMode === "webcam" ? (
                    <WebcamCapture
                      onFrameCapture={handleFrameCapture}
                      isProcessing={isProcessing}
                      intervalMs={sampleInterval}
                    />
                  ) : (
                    <div className="relative flex flex-col w-full h-full overflow-hidden border rounded-2xl bg-zinc-950 border-zinc-900/80 backdrop-blur-xl">
                      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/40 border-b border-zinc-900 font-mono text-[9px] text-zinc-500">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span>INVESTOR DEMO SIMULATING SEED INGESTION</span>
                        </div>
                      </div>

                      <div className="relative flex-1 flex flex-col items-center justify-center bg-black/60 p-6 text-center">
                        <div className="absolute inset-0 pointer-events-none border-t border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 to-transparent animate-scan" />
                        
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        
                        <h3 className="text-xs font-semibold text-zinc-300 mb-1 font-mono uppercase">Simulation Engine Active</h3>
                        <p className="text-[11px] text-zinc-500 mb-4 max-w-xs leading-normal">
                          Generating multi-facility occupancy models, carbon saving stats, and alert payloads.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* PRIORITY 5: UPGRADED AI OPERATIONS COPILOT CHAT */}
                <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col h-[280px]">
                  <div className="bg-zinc-900/30 border-b border-zinc-900/80 px-4 py-2 flex items-center justify-between text-[9px] font-mono rounded-t-lg">
                    <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      EXECUTIVE OPERATIONS COPILOT (CHATGPT CORE)
                    </span>
                    <span className="text-zinc-600">LIVE HEARTBEAT</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] max-h-[140px]">
                    {copilotMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[90%] rounded-lg px-2.5 py-1.5 leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-zinc-900 border border-zinc-800/80 text-zinc-300"
                          }`}
                        >
                          <span className="text-[8px] block text-zinc-550 font-bold mb-0.5">
                            {msg.sender === "user" ? "ADMIN" : "SENTINELAI X"}
                          </span>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isCopilotTyping && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-zinc-500 animate-pulse">
                          Querying live telemetry database...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggest queries */}
                  <div className="px-4 py-1.5 flex gap-1.5 overflow-x-auto bg-zinc-950/40 border-t border-zinc-900/60">
                    <button
                      onClick={() => setCopilotInput("Which room is wasting the most energy?")}
                      className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[8px] rounded-full transition-all whitespace-nowrap font-mono"
                    >
                      Most Energy Waste?
                    </button>
                    <button
                      onClick={() => setCopilotInput("Which building has the highest risk score?")}
                      className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[8px] rounded-full transition-all whitespace-nowrap font-mono"
                    >
                      Highest Risk?
                    </button>
                    <button
                      onClick={() => setCopilotInput("What actions were taken automatically?")}
                      className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[8px] rounded-full transition-all whitespace-nowrap font-mono"
                    >
                      Auto Actions?
                    </button>
                  </div>

                  <form onSubmit={handleCopilotSubmit} className="flex border-t border-zinc-900">
                    <input
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      placeholder="Ask the Copilot..."
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs font-mono text-white focus:outline-none placeholder-zinc-750"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 text-xs font-mono font-bold transition-all"
                    >
                      ASK
                    </button>
                  </form>
                </div>

              </div>

            </section>
          </>
        ) : (
          /* PRIORITY 4: EXECUTIVE DASHBOARD MODE */
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Detailed ROI charts and metrics */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2">
                  Financial ROI projections & savings metrics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-950/45 p-4 rounded-xl border border-zinc-900 font-mono">
                    <span className="text-[8px] text-zinc-500 uppercase block">Estimated Daily Savings</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">₹{metrics.energySavedTodayINR}</span>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Based on real-time automated grid shutoffs.</p>
                  </div>
                  <div className="bg-zinc-950/45 p-4 rounded-xl border border-zinc-900 font-mono">
                    <span className="text-[8px] text-zinc-500 uppercase block">Weekly Aggregate Savings</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">₹{metrics.energySavedThisWeekINR}</span>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Extrapolated from weekly sensor cycles.</p>
                  </div>
                  <div className="bg-zinc-950/45 p-4 rounded-xl border border-zinc-900 font-mono">
                    <span className="text-[8px] text-zinc-500 uppercase block">Monthly Total Savings</span>
                    <span className="text-xl font-bold text-teal-400 mt-1 block">₹{metrics.energySavedThisMonthINR}</span>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Prevented resource waste across 5 blocks.</p>
                  </div>
                  <div className="bg-zinc-950/45 p-4 rounded-xl border border-zinc-900 font-mono">
                    <span className="text-[8px] text-zinc-500 uppercase block">Projected Annual ROI</span>
                    <span className="text-xl font-bold text-white mt-1 block">₹{metrics.projectedAnnualSavingsINR}</span>
                    <p className="text-[9px] text-zinc-500 mt-1 leading-relaxed">Estimated annual operations savings value.</p>
                  </div>
                </div>

                {/* SVG Visual Chart */}
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-900 h-[220px] flex flex-col justify-between">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase block">Projected Monthly Savings trend (12 Months)</span>
                  <div className="flex-1 flex items-end justify-between gap-2 pt-6">
                    {[34, 45, 52, 60, 58, 68, 74, 82, 85, 91, 95, 100].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-indigo-600/80 to-indigo-400 rounded-t-sm transition-all duration-700" 
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[8px] text-zinc-600 font-mono mt-1">M{i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PRIORITY 7: SUSTAINABILITY IMPACT ESG DASHBOARD (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between h-[360px]">
                <div>
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-4">
                    ESG Sustainability Audit
                  </h3>

                  <div className="space-y-4 font-mono">
                    <div className="p-3 bg-zinc-950/45 border border-zinc-900 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">Carbon Emission Saved</span>
                        <span className="text-base font-bold text-emerald-400 mt-0.5 block">{metrics.carbonReducedKg} kg CO₂</span>
                      </div>
                      <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">ACTIVE</span>
                    </div>

                    <div className="p-3 bg-zinc-950/45 border border-zinc-900 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">Equivalent Trees Saved</span>
                        <span className="text-base font-bold text-emerald-400 mt-0.5 block">{metrics.equivalentTreesSaved} Trees</span>
                      </div>
                      <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">ECO</span>
                    </div>

                    <div className="p-3 bg-zinc-950/45 border border-zinc-900 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">Environmental Impact score</span>
                        <span className="text-base font-bold text-white mt-0.5 block">{metrics.environmentalImpactScore}/100</span>
                      </div>
                      <div className="w-16 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${metrics.environmentalImpactScore}%` }} />
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-950/45 border border-zinc-900 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">Corporate Sustainability Index</span>
                        <span className="text-base font-bold text-indigo-400 mt-0.5 block">{metrics.sustainabilityIndex}%</span>
                      </div>
                      <span className="text-[9px] text-zinc-650">NOMINAL RATE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </section>
        )}

        {/* SECTION 4: ACTIONS FEED, INCIDENTS, TIMELINE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Incident Tickets (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3">
              Incident Management System
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {incidents.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8 font-mono">No active incident logs.</div>
              ) : (
                incidents.map((ticket) => (
                  <div key={ticket.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg flex flex-col justify-between gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            ticket.severity === "CRITICAL" ? "bg-rose-500 animate-ping" : ticket.severity === "HIGH" ? "bg-rose-400" : "bg-amber-400"
                          }`} />
                          <span className="text-xs font-bold text-white font-mono">{ticket.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">ID: {ticket.id} | Room: {ticket.roomId}</span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        ticket.status === "active" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-zinc-400">{ticket.description}</p>

                    <div className="flex justify-between items-center border-t border-zinc-900 pt-2 mt-1">
                      <span className="text-[9px] font-mono text-zinc-650">{new Date(ticket.timestamp).toLocaleTimeString()}</span>
                      {ticket.status === "active" && (
                        <button
                          onClick={() => resolveTicket(ticket.id)}
                          className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-bold transition-all cursor-pointer font-mono"
                        >
                          RESOLVE
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* PRIORITY 6: AUTONOMOUS ACTION VISUALIZATION FEED */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3">
              Autonomous Actions Feed
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {actions.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8 font-mono">Waiting for AI decisions...</div>
              ) : (
                actions.map((act) => {
                  let agentName = "Security Agent";
                  let agentColor = "text-indigo-400";
                  if (act.type.includes("LIGHT") || act.type.includes("FAN")) {
                    agentName = "Energy Agent";
                    agentColor = "text-emerald-400";
                  } else if (act.type.includes("INCIDENT") || act.type.includes("NOTIFICATION")) {
                    agentName = "Safety Agent";
                    agentColor = "text-amber-400";
                  }

                  return (
                    <div key={act.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg font-mono text-[11px]">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold text-xs ${agentColor}`}>{agentName.toUpperCase()}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          act.status === "completed" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : act.status === "executing"
                              ? "bg-indigo-500/10 text-indigo-400 animate-pulse"
                              : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {act.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[9px] text-zinc-550 mb-1">ACTION: {act.type} | ID: {act.id}</div>
                      <p className="text-zinc-400 leading-normal mb-1">{act.details}</p>
                      <div className="text-[9px] text-zinc-600 text-right">{new Date(act.timestamp).toLocaleTimeString()}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Event Timeline (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3">
              Campus Event Timeline
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {timeline.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8">Waiting for sensory events...</div>
              ) : (
                timeline.map((evt) => (
                  <div key={evt.id} className="flex gap-2.5 items-start p-1.5 rounded hover:bg-zinc-900/30 transition-colors">
                    <span className="text-zinc-650 text-[9px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    <span className={`w-2 h-2 mt-1 rounded-full flex-shrink-0 ${
                      evt.type === "critical" 
                        ? "bg-rose-500" 
                        : evt.type === "warning"
                          ? "bg-amber-500"
                          : evt.type === "action"
                            ? "bg-indigo-400"
                            : "bg-zinc-500"
                    }`} />
                    <div className="flex-1">
                      <span className="text-zinc-300">{evt.message}</span>
                      <span className="text-[9px] text-zinc-600 block">Room: {evt.roomId}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
