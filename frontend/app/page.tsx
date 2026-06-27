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

  // Tab State for Campus Facilities
  const [selectedBlock, setSelectedBlock] = useState<string>("Engineering Block");
  const campusBlocks = [
    "Engineering Block",
    "Library",
    "Administration Block",
    "Research Center",
    "Hostel Block"
  ];

  // Core Telemetry State
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ROOM_ENG_101");
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
    automationSuccessRate: 98
  });
  
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [simulationMode, setSimulationMode] = useState<"webcam" | "demo">("webcam");
  const [sampleInterval, setSampleInterval] = useState<number>(3000);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [systemClock, setSystemClock] = useState<string>("");

  // Executive AI Copilot Chat State
  const [copilotInput, setCopilotInput] = useState<string>("");
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: "user" | "copilot"; text: string }>>([
    {
      sender: "copilot",
      text: "Good morning Administrator. SentinelAI X is fully operational. How can I assist you with physical space diagnostics, optimization routines, or security audits today?"
    }
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active target room lookup
  const activeRoom = rooms.find((r) => r.roomId === selectedRoomId) || rooms[0];

  // Update clock
  useEffect(() => {
    setSystemClock(new Date().toLocaleTimeString());
    const clockTimer = setInterval(() => {
      setSystemClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Scroll copilot chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilotMessages]);

  // Sync state from operations server
  const refreshDashboard = useCallback(async () => {
    try {
      const roomsRes = await fetch(`${backendUrl}/api/rooms`);
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        if (roomsData.success) {
          setRooms(roomsData.rooms);
          
          // Auto-select first room of selected block if current selection is not in the block
          const filtered = roomsData.rooms.filter((r: RoomState) => r.facility === selectedBlock);
          if (filtered.length > 0 && !filtered.some((r: RoomState) => r.roomId === selectedRoomId)) {
            setSelectedRoomId(filtered[0].roomId);
          }
        }
      }

      const metricsRes = await fetch(`${backendUrl}/api/metrics`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        if (metricsData.success) setMetrics(metricsData.metrics);
      }

      const incidentsRes = await fetch(`${backendUrl}/api/incidents`);
      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        if (incidentsData.success) setIncidents(incidentsData.incidents);
      }

      const actionsRes = await fetch(`${backendUrl}/api/actions`);
      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        if (actionsData.success) setActions(actionsData.actions);
      }

      const insightsRes = await fetch(`${backendUrl}/api/insights`);
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        if (insightsData.success) setInsights(insightsData.insights);
      }

      const timelineRes = await fetch(`${backendUrl}/api/timeline`);
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        if (timelineData.success) setTimeline(timelineData.events);
      }
    } catch (err) {
      console.warn("Telemetry link heartbeat failed:", err);
    }
  }, [backendUrl, selectedBlock, selectedRoomId]);

  // Initial and continuous polling
  useEffect(() => {
    refreshDashboard();
    const pollTimer = setInterval(refreshDashboard, 2000);
    return () => clearInterval(pollTimer);
  }, [refreshDashboard]);

  // Device override action
  const toggleDevice = async (roomId: string, device: keyof DeviceStates, currentState: boolean) => {
    try {
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, state: !currentState })
      });
      if (response.ok) {
        setToastMessage(`DEPLOYED: Manual control command written for ${device.toUpperCase()}.`);
        setTimeout(() => setToastMessage(null), 2000);
        refreshDashboard();
      }
    } catch (err) {
      console.error("Device signal failure:", err);
    }
  };

  // Ticket Manual Resolution
  const resolveTicket = async (incidentId: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/incidents/${incidentId}/resolve`, {
        method: "POST"
      });
      if (response.ok) {
        setToastMessage("TICKET STATUS RESOLVED.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshDashboard();
      }
    } catch (err) {
      console.error("Ticket action failed:", err);
    }
  };

  // Copilot Message Submit
  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userText = copilotInput;
    setCopilotMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setCopilotInput("");
    setIsCopilotTyping(true);

    try {
      const response = await fetch(`${backendUrl}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });

      if (response.ok) {
        const data = await response.json();
        setCopilotMessages((prev) => [...prev, { sender: "copilot", text: data.response }]);
      } else {
        setCopilotMessages((prev) => [
          ...prev,
          { sender: "copilot", text: "I apologize, but my diagnostics stream is currently overloaded. Please try again." }
        ]);
      }
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        { sender: "copilot", text: "Link error. Unable to process command." }
      ]);
    } finally {
      setIsCopilotTyping(false);
    }
  };

  // Edge Sensor Frame Ingestion
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
          setToastMessage(`INGEST: Frame processed successfully for ${selectedRoomId}`);
          setTimeout(() => setToastMessage(null), 800);
          refreshDashboard();
        }
      } catch (err) {
        console.warn("Sensor link offline.", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedRoomId, isProcessing, simulationMode, backendUrl, refreshDashboard]
  );

  // Simulator loop trigger
  useEffect(() => {
    if (simulationMode !== "demo") return;

    const demoTimer = setInterval(async () => {
      // Pick a random room to simulate activity in
      const allRoomIds = rooms.map(r => r.roomId);
      if (allRoomIds.length === 0) return;
      const randomRoomId = allRoomIds[Math.floor(Math.random() * allRoomIds.length)];

      const mockObjects = [];
      const rand = Math.random();

      if (randomRoomId.includes("RES") || randomRoomId.includes("D")) {
        // High-security lab
        if (rand > 0.6) {
          mockObjects.push({ label: "person", confidence: 0.98 });
        }
      } else if (randomRoomId.includes("ENG")) {
        // Engineering rooms
        if (rand > 0.4) {
          mockObjects.push({ label: "person", confidence: 0.94 });
        }
        if (rand > 0.8) {
          mockObjects.push({ label: "obstacle", confidence: 0.87 });
        }
      } else if (randomRoomId.includes("LIB")) {
        // Library
        if (rand > 0.3) {
          mockObjects.push({ label: "person", confidence: 0.92 });
        }
      } else if (randomRoomId.includes("HOS")) {
        // Hostel
        if (rand > 0.2) {
          // Crowd simulation
          const crowdSize = Math.floor(Math.random() * 12) + 1;
          for (let i = 0; i < crowdSize; i++) {
            mockObjects.push({ label: "person", confidence: 0.9 + Math.random() * 0.09 });
          }
        }
      }

      try {
        await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: randomRoomId,
            image: "data:image/jpeg;base64,MOCK_PAYLOAD",
            objects: mockObjects
          })
        });
        refreshDashboard();
      } catch (err) {
        console.warn("Sim frame failed:", err);
      }
    }, sampleInterval);

    return () => clearInterval(demoTimer);
  }, [simulationMode, sampleInterval, rooms, backendUrl, refreshDashboard]);

  // Filtered rooms based on tabs
  const filteredRooms = rooms.filter((r) => r.facility === selectedBlock);

  // Suggested quick command responses
  const quickQuestions = [
    "Are there any security threats?",
    "Show energy wastage rooms",
    "Audit safety compliance status"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-900 border border-indigo-500/80 text-indigo-400 font-mono px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-[11px] flex items-center gap-2 border-glow">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Top Banner Header */}
      <header className="flex flex-col lg:flex-row items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-400 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
              SentinelAI X <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-indigo-400 border border-zinc-800">OS 2.0</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">The Operating System for Physical Spaces</p>
          </div>
        </div>

        {/* Global Connection Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-3 lg:mt-0 font-mono">
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => {
                setSimulationMode("webcam");
                setToastMessage("Live Edge-webcam activated.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                simulationMode === "webcam" ? "bg-zinc-800 text-indigo-400 border border-zinc-750" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              EDGE CAM
            </button>
            <button
              onClick={() => {
                setSimulationMode("demo");
                setToastMessage("Autonomous campus simulation active.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                simulationMode === "demo" ? "bg-zinc-800 text-indigo-400 border border-zinc-750" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SIMULATOR
            </button>
          </div>

          {simulationMode === "demo" && (
            <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
              <span className="text-[8px] text-zinc-500 px-1">TICK:</span>
              <select
                value={sampleInterval}
                onChange={(e) => setSampleInterval(Number(e.target.value))}
                className="bg-transparent text-indigo-400 border-none outline-none text-xs rounded px-1 font-semibold cursor-pointer"
              >
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
              </select>
            </div>
          )}

          <div className="text-right hidden sm:block border-l border-zinc-900 pl-4">
            <span className="text-[9px] text-zinc-600 block">SYSTEM TIME</span>
            <span className="text-xs font-semibold text-zinc-400">{systemClock || "--:--:--"}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Dashboard */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto flex flex-col gap-6">

        {/* SECTION 1: EXECUTIVE AI COPILOT (ChatGPT for Operations Teams) */}
        <section className="glass-panel p-5 rounded-2xl border-l-4 border-l-indigo-500 shadow-xl shadow-indigo-950/10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Executive Overview Analytics */}
          <div className="lg:col-span-5 flex flex-col justify-between font-mono">
            <div>
              <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Platform Intelligence Summary</div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                Good Morning Administrator
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-4">
              <div>
                <span className="text-[9px] text-zinc-500 block">CAMPUS STATUS</span>
                <span className="text-xs font-bold text-emerald-400">OPERATIONAL</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">NODES MONITORING</span>
                <span className="text-xs font-bold text-white">{rooms.length} / 24 active</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">INTELLIGENT AGENTS</span>
                <span className="text-xs font-bold text-indigo-400">4 / 4 Active</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">OPEN TICKETS</span>
                <span className={`text-xs font-bold ${incidents.filter(i => i.status === "active").length > 0 ? "text-rose-400" : "text-white"}`}>
                  {incidents.filter(i => i.status === "active").length} active
                </span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">SAVED TODAY</span>
                <span className="text-xs font-bold text-emerald-400">₹{metrics.energySavedTodayINR}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block">EST. MONTHLY ROI</span>
                <span className="text-xs font-bold text-teal-400">₹{metrics.energySavedThisMonthINR}</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-2.5 text-[11px] text-zinc-400 leading-relaxed">
              <span className="text-indigo-400 font-bold">RECOMMENDED ROUTINE:</span> Disable {activeRoom?.roomName || "Lab-3"} lighting grid grid during unoccupied periods to secure an estimated ₹{metrics.energySavedTodayINR * 3} monthly savings.
            </div>
          </div>

          {/* Interactive Copilot Chat Interface */}
          <div className="lg:col-span-7 flex flex-col h-[200px] border border-zinc-900 rounded-xl bg-zinc-950/40 relative overflow-hidden">
            <div className="bg-zinc-900/30 border-b border-zinc-900 px-4 py-2 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                EXECUTIVE COPILOT CHAT STREAM
              </span>
              <span className="text-zinc-600">STATE CORRELATED</span>
            </div>

            {/* Chat message board */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {copilotMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-900/80 border border-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <span className="text-[9px] block text-zinc-500 font-bold mb-0.5">
                      {msg.sender === "user" ? "ADMIN" : "SENTINELAI X"}
                    </span>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isCopilotTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-lg px-3 py-2 text-zinc-500 animate-pulse">
                    Synthesizing environment data logs...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat prompt templates */}
            <div className="px-4 py-1.5 flex gap-2 overflow-x-auto border-t border-zinc-900/40 bg-zinc-950/60">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCopilotInput(q)}
                  className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-[9px] font-mono rounded-full transition-all whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleCopilotSubmit} className="flex border-t border-zinc-900">
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Ask SentinelAI X (e.g., 'Are there any security threats?')"
                className="flex-1 bg-transparent px-4 py-2 text-xs font-mono text-white focus:outline-none placeholder-zinc-700"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 text-xs font-mono font-bold transition-all"
              >
                EXECUTE
              </button>
            </form>
          </div>

        </section>

        {/* SECTION 2: ROI VALUE METRICS BOARD */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Energy Saved Today</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">₹{metrics.energySavedTodayINR}</span>
            <span className="text-[8px] text-zinc-600 block">Est: {metrics.estimatedEnergySaved} kWh</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Saved This Week</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">₹{metrics.energySavedThisWeekINR}</span>
            <span className="text-[8px] text-zinc-600 block">7-Day Aggregated</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Saved This Month</span>
            <span className="text-xl font-bold text-teal-400 mt-1 block">₹{metrics.energySavedThisMonthINR}</span>
            <span className="text-[8px] text-zinc-600 block">30-Day Aggregated</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Projected Annual Savings</span>
            <span className="text-xl font-bold text-white mt-1 block">₹{metrics.projectedAnnualSavingsINR}</span>
            <span className="text-[8px] text-zinc-600 block">Calculated ROI Index</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Operational Efficiency</span>
            <span className="text-xl font-bold text-indigo-400 mt-1 block">{metrics.operationalEfficiencyScore}%</span>
            <span className="text-[8px] text-zinc-600 block">Incident Resolution Ratio</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Incident Reduction %</span>
            <span className="text-xl font-bold text-teal-400 mt-1 block">-{metrics.incidentReductionPercent}%</span>
            <span className="text-[8px] text-zinc-600 block">Vs. Historical Baseline</span>
          </div>
          <div className="glass-panel p-4 rounded-xl font-mono relative overflow-hidden">
            <span className="text-[9px] text-zinc-500 block uppercase">Automation Success</span>
            <span className="text-xl font-bold text-white mt-1 block">{metrics.automationSuccessRate}%</span>
            <span className="text-[8px] text-zinc-600 block">Completed Actuators Ratio</span>
          </div>
        </section>

        {/* SECTION 3: DIGITAL TWIN COMMAND CENTER (Facility tabs and Room grid) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Digital Twin (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Tab selector for buildings */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                Digital Twin Campus Command Center
              </h2>
              <span className="text-xs text-zinc-600 font-mono">CAMPUS BLOCKS DIRECTORY</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {campusBlocks.map((block) => (
                <button
                  key={block}
                  onClick={() => setSelectedBlock(block)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border whitespace-nowrap ${
                    selectedBlock === block
                      ? "bg-indigo-600/90 text-white border-indigo-500 shadow-md shadow-indigo-600/10"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {block.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Room cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const isSelected = room.roomId === selectedRoomId;
                const activeAlertsCount = incidents.filter(i => i.roomId === room.roomId && i.status === "active").length;

                return (
                  <div
                    key={room.roomId}
                    onClick={() => setSelectedRoomId(room.roomId)}
                    className={`glass-panel p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                      isSelected 
                        ? "border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.1)] bg-indigo-950/15" 
                        : "hover:border-zinc-700/80"
                    }`}
                  >
                    {activeAlertsCount > 0 && (
                      <div className="absolute top-0 right-0 w-24 h-2 bg-rose-500/80 blur-md pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors font-mono">
                          {room.roomName}
                        </h3>
                        <span className="text-[9px] font-mono text-zinc-500">ID: {room.roomId}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        room.riskLevel === "CRITICAL" || room.riskLevel === "HIGH" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : room.riskLevel === "MEDIUM"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {room.statusSummary}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-4 text-xs font-mono text-zinc-400">
                      <div>
                        <span className="text-[8px] text-zinc-600 block">OCCUPANCY</span>
                        <span className="text-white font-semibold">{room.peopleCount} present</span>
                        <span className="text-[8px] text-zinc-500 block">({room.occupancyStatus})</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-600 block">RISK LEVEL</span>
                        <span className={`font-semibold ${
                          room.riskLevel === "CRITICAL" || room.riskLevel === "HIGH" ? "text-rose-400" : "text-zinc-300"
                        }`}>{room.riskLevel}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-600 block">AI CONFIDENCE</span>
                        <span className="text-white font-semibold">{Math.round(room.confidence * 100)}%</span>
                      </div>
                    </div>

                    {/* Device States toggles */}
                    <div className="border-t border-zinc-900 pt-3 flex flex-wrap items-center justify-between font-mono gap-2">
                      <span className="text-[8px] text-zinc-500 uppercase">Actuation Layer:</span>
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
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/45" 
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

            {/* Explainable AI Center: Renders detailed agent decision cards */}
            {activeRoom && (
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Multi-Agent AI Intelligence Diagnostic Center
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">TARGET: {activeRoom.roomName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                  
                  {/* Security Agent */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          activeRoom.agents.security.decision !== "SECURE" ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                        }`} />
                        SECURITY AGENT
                      </span>
                      <span className="text-[9px] text-zinc-500">CONF: {Math.round(activeRoom.agents.security.confidence * 100)}%</span>
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Observation:</span> {activeRoom.agents.security.observation}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Reasoning:</span> {activeRoom.agents.security.reasoning}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Decision:</span> <span className={activeRoom.agents.security.decision !== "SECURE" ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{activeRoom.agents.security.decision}</span></div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Recommended Action:</span> <span className="text-indigo-400 font-bold">{activeRoom.agents.security.recommendedAction}</span></div>
                    </div>
                  </div>

                  {/* Energy Agent */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          activeRoom.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        }`} />
                        ENERGY AGENT
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold text-emerald-400">SAVINGS: {activeRoom.agents.energy.savingsEstimate}</span>
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Observation:</span> {activeRoom.agents.energy.observation}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Reasoning:</span> {activeRoom.agents.energy.reasoning}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Decision:</span> <span className={activeRoom.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{activeRoom.agents.energy.decision}</span></div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Recommended Action:</span> <span className="text-indigo-400 font-bold">{activeRoom.agents.energy.recommendedAction}</span></div>
                    </div>
                  </div>

                  {/* Safety Agent */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          activeRoom.agents.safety.decision !== "COMPLIANT" ? "bg-rose-400" : "bg-emerald-500"
                        }`} />
                        SAFETY AGENT
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold text-rose-400">RISK: {activeRoom.agents.safety.riskLevel}</span>
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Observation:</span> {activeRoom.agents.safety.observation}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Reasoning:</span> {activeRoom.agents.safety.reasoning}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Decision:</span> <span className={activeRoom.agents.safety.decision !== "COMPLIANT" ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{activeRoom.agents.safety.decision}</span></div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Action:</span> <span className="text-indigo-400 font-bold">{activeRoom.agents.safety.action}</span></div>
                    </div>
                  </div>

                  {/* Facility Agent */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        FACILITY AGENT
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold text-indigo-400">HEALTH: {activeRoom.agents.facility.facilityHealthScore}/100</span>
                    </div>
                    <div className="space-y-1">
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Observation:</span> {activeRoom.agents.facility.observation}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Recommendation:</span> {activeRoom.agents.facility.recommendation}</div>
                      <div><span className="text-zinc-600 block text-[9px] uppercase">Priority:</span> <span className={`font-bold ${activeRoom.agents.facility.priority === "HIGH" ? "text-rose-400" : "text-zinc-300"}`}>{activeRoom.agents.facility.priority}</span></div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Sensor Feeds (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-400 font-mono flex items-center gap-1.5">
                Target Sensor Ingestion Feed
              </h2>
              <span className="text-xs text-indigo-400 font-mono">NODE: {selectedRoomId}</span>
            </div>

            {/* Webcam capture component */}
            <div className="h-[380px]">
              {simulationMode === "webcam" ? (
                <WebcamCapture
                  onFrameCapture={handleFrameCapture}
                  isProcessing={isProcessing}
                  intervalMs={sampleInterval}
                />
              ) : (
                <div className="relative flex flex-col w-full h-full overflow-hidden border rounded-2xl bg-zinc-950 border-zinc-800/80 backdrop-blur-xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span>CAMPUS SIMULATION FEED INGESTION</span>
                    </div>
                    <span className="text-zinc-500">MOCK STREAM</span>
                  </div>

                  <div className="relative flex-1 flex flex-col items-center justify-center bg-black/60 p-6 text-center">
                    <div className="absolute inset-0 pointer-events-none border-t border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 to-transparent animate-scan" />

                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-xs font-semibold text-zinc-300 mb-1 font-mono uppercase">Simulation Engine Active</h3>
                    <p className="text-xs text-zinc-500 mb-4 max-w-xs leading-normal">
                      SentinelAI X environment simulation is posting mock data streams periodically to local route arrays.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Predictive Intelligence */}
            <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3 flex items-center gap-1.5">
                  Predictive Space Analytics
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {insights.map((insight) => (
                    <div key={insight.id} className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg text-xs font-mono">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-indigo-400">{insight.title}</span>
                        <span className="text-[9px] text-zinc-500">CONFIDENCE: {insight.confidence}%</span>
                      </div>
                      <p className="text-zinc-400 leading-normal mb-1">{insight.message}</p>
                      <div className="text-[9px] text-emerald-400 font-bold">IMPACT VALUE: {insight.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* SECTION 4: ACTIONS FEED, TIMELINE LOGS, INCIDENT TICKETS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Incident Management System (4 cols) */}
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

          {/* Live Action Feed (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3">
              Action Orchestration logs
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {actions.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8 font-mono">Waiting for AI decisions...</div>
              ) : (
                actions.map((act) => (
                  <div key={act.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg font-mono text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">{act.type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        act.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : act.status === "executing"
                            ? "bg-indigo-500/10 text-indigo-400 animate-pulse"
                            : act.status === "failed"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {act.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-655 mb-1">ID: {act.id} | NODE: {act.roomId}</div>
                    <p className="text-zinc-400 leading-normal mb-1">{act.details}</p>
                    <div className="text-[9px] text-zinc-600 text-right">{new Date(act.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chronological Event Timeline (4 cols) */}
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
                    <span className="text-zinc-600 text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
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
