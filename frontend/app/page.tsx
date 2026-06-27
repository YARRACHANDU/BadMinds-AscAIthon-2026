"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  // Connection Configuration
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:2005";

  // State Management
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ROOM_A");
  const [metrics, setMetrics] = useState<OperationalMetrics>({
    occupancyRate: 0,
    securityScore: 100,
    safetyScore: 100,
    energyEfficiencyScore: 100,
    aiConfidenceAverage: 95,
    incidentsToday: 0,
    actionsExecuted: 0,
    estimatedEnergySaved: 0
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

  // Get active room state helper
  const activeRoom = rooms.find((r) => r.roomId === selectedRoomId) || rooms[0];

  // Refresh clock
  useEffect(() => {
    setSystemClock(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setSystemClock(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard State from Backend
  const refreshDashboardState = useCallback(async () => {
    try {
      // 1. Fetch Rooms
      const roomsRes = await fetch(`${backendUrl}/api/rooms`);
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        if (roomsData.success) setRooms(roomsData.rooms);
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
      console.warn("Failed to sync with operations backend:", err);
    }
  }, [backendUrl]);

  // Initial Sync and Polling Loop
  useEffect(() => {
    refreshDashboardState();
    const interval = setInterval(refreshDashboardState, 2000);
    return () => clearInterval(interval);
  }, [refreshDashboardState]);

  // Handle Manual Device Override
  const toggleDevice = async (roomId: string, device: keyof DeviceStates, currentState: boolean) => {
    try {
      const response = await fetch(`${backendUrl}/api/rooms/${roomId}/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, state: !currentState })
      });
      if (response.ok) {
        setToastMessage(`Manual override: Changed ${device.toUpperCase()} state.`);
        setTimeout(() => setToastMessage(null), 2500);
        refreshDashboardState();
      }
    } catch (err) {
      console.error("Device toggle failed:", err);
    }
  };

  // Handle Ticket Resolution
  const resolveTicket = async (incidentId: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/incidents/${incidentId}/resolve`, {
        method: "POST"
      });
      if (response.ok) {
        setToastMessage("Incident ticket successfully marked as resolved.");
        setTimeout(() => setToastMessage(null), 2500);
        refreshDashboardState();
      }
    } catch (err) {
      console.error("Incident resolution failed:", err);
    }
  };

  // Ingest Webcam Stream Frame
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
          setToastMessage(`Edge Frame ingested for ${selectedRoomId}`);
          setTimeout(() => setToastMessage(null), 1000);
          refreshDashboardState();
        }
      } catch (err) {
        console.warn("Edge ingestion link offline.", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedRoomId, isProcessing, simulationMode, backendUrl, refreshDashboardState]
  );

  // Demo Simulator Trigger
  useEffect(() => {
    if (simulationMode !== "demo") return;

    const demoTimer = setInterval(async () => {
      const roomKeys = ["ROOM_A", "ROOM_B", "ROOM_C", "ROOM_D"];
      const randomRoom = roomKeys[Math.floor(Math.random() * roomKeys.length)];

      // Generate simulated visual object detection array
      const mockObjects = [];
      const rand = Math.random();

      if (randomRoom === "ROOM_D") {
        // Server Room
        if (rand > 0.7) {
          mockObjects.push({ label: "person", confidence: 0.97 });
        }
      } else if (randomRoom === "ROOM_B") {
        // Warehouse
        if (rand > 0.6) {
          mockObjects.push({ label: "obstacle", confidence: 0.88 });
        }
        if (rand > 0.8) {
          mockObjects.push({ label: "person", confidence: 0.91 });
        }
      } else {
        // Lab or Executive
        if (rand > 0.5) {
          mockObjects.push({ label: "person", confidence: 0.93 });
        }
      }

      try {
        await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: randomRoom,
            image: "data:image/jpeg;base64,MOCK_DATA",
            objects: mockObjects
          })
        });
        refreshDashboardState();
      } catch (err) {
        console.warn("Simulator request failed:", err);
      }
    }, sampleInterval);

    return () => clearInterval(demoTimer);
  }, [simulationMode, sampleInterval, backendUrl, refreshDashboardState]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-indigo-600/90 border border-indigo-400 text-white font-mono px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-[11px] flex items-center gap-2 animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Header panel */}
      <header className="flex flex-col lg:flex-row items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <svg className="w-6 h-6 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SentinelAI <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-400 border border-zinc-700">v2.0 PRO</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono">CAMPUS PHYSICAL AI OPERATIONAL ENGINE</p>
          </div>
        </div>

        {/* Global Control Station */}
        <div className="flex flex-wrap items-center gap-4 mt-3 lg:mt-0 font-mono">
          
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setSimulationMode("webcam");
                setToastMessage("Switched to Live Camera Stream.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                simulationMode === "webcam" ? "bg-zinc-800 text-indigo-400 border border-zinc-750" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              LIVE CAMERA
            </button>
            <button
              onClick={() => {
                setSimulationMode("demo");
                setToastMessage("Active Campus Simulator Engaged.");
                setTimeout(() => setToastMessage(null), 2000);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                simulationMode === "demo" ? "bg-zinc-800 text-indigo-400 border border-zinc-750" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SIMULATOR
            </button>
          </div>

          {/* Rate Selector */}
          {simulationMode === "demo" && (
            <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
              <span className="text-[9px] text-zinc-400 px-1">TICK:</span>
              <select
                value={sampleInterval}
                onChange={(e) => setSampleInterval(Number(e.target.value))}
                className="bg-zinc-850 text-indigo-400 border-none outline-none text-xs rounded-lg px-2 py-0.5 font-medium cursor-pointer"
              >
                <option value={2000}>2s (Fast)</option>
                <option value={3000}>3s (Standard)</option>
                <option value={5000}>5s (Eco)</option>
              </select>
            </div>
          )}

          <div className="text-right hidden sm:block border-l border-zinc-800 pl-4">
            <span className="text-[10px] text-zinc-500 uppercase block">CLOCK</span>
            <span className="text-xs font-semibold text-zinc-300">{systemClock || "--:--:--"}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto flex flex-col gap-6">
        
        {/* ROW 1: Real-Time Operational Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          
          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Occupancy Rate</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.occupancyRate}%</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${metrics.occupancyRate}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Security Index</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.securityScore}/100</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  metrics.securityScore > 80 ? "bg-emerald-500" : metrics.securityScore > 50 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${metrics.securityScore}%` }} 
              />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Safety Compliance</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.safetyScore}/100</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  metrics.safetyScore > 80 ? "bg-emerald-500" : "bg-amber-500"
                }`} 
                style={{ width: `${metrics.safetyScore}%` }} 
              />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Energy Efficiency</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.energyEfficiencyScore}%</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${metrics.energyEfficiencyScore}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Avg AI Confidence</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.aiConfidenceAverage}%</div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${metrics.aiConfidenceAverage}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Active Tickets</div>
            <div className={`text-2xl font-bold mt-1 ${incidents.filter(i => i.status === "active").length > 0 ? "text-rose-500" : "text-white"}`}>
              {incidents.filter(i => i.status === "active").length}
            </div>
            <div className="text-[9px] text-zinc-600 mt-2 font-mono">TODAY: {metrics.incidentsToday}</div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Actions Fired</div>
            <div className="text-2xl font-bold mt-1 text-white">{metrics.actionsExecuted}</div>
            <div className="text-[9px] text-zinc-600 mt-2 font-mono">AUTOMATED DEPLOYED</div>
          </div>

          <div className="glass-panel p-4 rounded-xl relative overflow-hidden">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Est. Saved Power</div>
            <div className="text-2xl font-bold mt-1 text-emerald-400">{metrics.estimatedEnergySaved} kWh</div>
            <div className="text-[9px] text-zinc-600 mt-2 font-mono">CARBON REDUCTION</div>
          </div>

        </section>

        {/* ROW 2: Multi-Room Command Center & Digital Twin cards */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Digital Twin Multi-Room Cards (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Digital Twin Campus Command Center
              </h2>
              <span className="text-xs text-zinc-600 font-mono">4 NODES SYNCED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map((room) => {
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
                    {/* Glow tag for alerts */}
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

                    <div className="grid grid-cols-2 gap-2 my-4 text-xs font-mono text-zinc-400">
                      <div>
                        <span className="text-[9px] text-zinc-600 block">OCCUPANCY</span>
                        <span className="text-white font-semibold">{room.peopleCount} present</span>
                        <span className="text-[9px] text-zinc-500 block">({room.occupancyStatus})</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-600 block">RISK LEVEL</span>
                        <span className={`font-semibold ${
                          room.riskLevel === "CRITICAL" || room.riskLevel === "HIGH" ? "text-rose-400" : "text-zinc-300"
                        }`}>{room.riskLevel}</span>
                      </div>
                    </div>

                    {/* Device state toggles */}
                    <div className="border-t border-zinc-900 pt-3 flex items-center justify-between font-mono">
                      <span className="text-[9px] text-zinc-500 uppercase">IoT Actuators:</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleDevice(room.roomId, "lights", room.deviceStates.lights)}
                          className={`px-2 py-0.5 rounded text-[9px] border font-bold transition-all ${
                            room.deviceStates.lights 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                              : "bg-zinc-900 text-zinc-600 border-zinc-800"
                          }`}
                        >
                          LIGHTS
                        </button>
                        <button
                          onClick={() => toggleDevice(room.roomId, "fan", room.deviceStates.fan)}
                          className={`px-2 py-0.5 rounded text-[9px] border font-bold transition-all ${
                            room.deviceStates.fan
                              ? "bg-teal-500/10 text-teal-400 border-teal-500/30 animate-pulse" 
                              : "bg-zinc-900 text-zinc-600 border-zinc-800"
                          }`}
                        >
                          FAN
                        </button>
                        <button
                          onClick={() => toggleDevice(room.roomId, "alarm", room.deviceStates.alarm)}
                          className={`px-2 py-0.5 rounded text-[9px] border font-bold transition-all ${
                            room.deviceStates.alarm
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-ping" 
                              : "bg-zinc-900 text-zinc-600 border-zinc-800"
                          }`}
                        >
                          ALARM
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Selected Room AI Multi-Agent Reasoning (Explainable Layer) */}
            {activeRoom && (
              <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Multi-Agent Operations Reasoning Panel
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">TARGET: {activeRoom.roomName}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Security Agent Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activeRoom.agents.security.decision !== "SECURE" ? "bg-rose-500" : "bg-emerald-500"
                        }`} />
                        SECURITY AGENT
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">CONF: {Math.round(activeRoom.agents.security.confidence * 100)}%</span>
                    </div>
                    <div className="text-[11px] font-mono space-y-1">
                      <div><span className="text-zinc-500">OBSERVATION:</span> {activeRoom.agents.security.observation}</div>
                      <div><span className="text-zinc-500">REASONING:</span> {activeRoom.agents.security.reasoning}</div>
                      <div><span className="text-zinc-500">DECISION:</span> <span className={activeRoom.agents.security.decision !== "SECURE" ? "text-rose-400" : "text-emerald-400"}>{activeRoom.agents.security.decision}</span></div>
                      <div><span className="text-zinc-500">RECOMMENDED ACTION:</span> <span className="text-indigo-400">{activeRoom.agents.security.recommendedAction}</span></div>
                    </div>
                  </div>

                  {/* Energy Agent Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activeRoom.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        }`} />
                        ENERGY AGENT
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">CONF: {Math.round(activeRoom.agents.energy.confidence * 100)}%</span>
                    </div>
                    <div className="text-[11px] font-mono space-y-1">
                      <div><span className="text-zinc-500">OBSERVATION:</span> {activeRoom.agents.energy.observation}</div>
                      <div><span className="text-zinc-500">REASONING:</span> {activeRoom.agents.energy.reasoning}</div>
                      <div><span className="text-zinc-500">DECISION:</span> <span className={activeRoom.agents.energy.decision === "ENERGY_WASTAGE_DETECTED" ? "text-amber-400" : "text-emerald-400"}>{activeRoom.agents.energy.decision}</span></div>
                      <div><span className="text-zinc-500">RECOMMENDED ACTION:</span> <span className="text-indigo-400">{activeRoom.agents.energy.recommendedAction}</span></div>
                    </div>
                  </div>

                  {/* Safety Agent Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          activeRoom.agents.safety.decision !== "COMPLIANT" ? "bg-rose-400" : "bg-emerald-500"
                        }`} />
                        SAFETY AGENT
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">CONF: {Math.round(activeRoom.agents.safety.confidence * 100)}%</span>
                    </div>
                    <div className="text-[11px] font-mono space-y-1">
                      <div><span className="text-zinc-500">OBSERVATION:</span> {activeRoom.agents.safety.observation}</div>
                      <div><span className="text-zinc-500">REASONING:</span> {activeRoom.agents.safety.reasoning}</div>
                      <div><span className="text-zinc-500">DECISION:</span> <span className={activeRoom.agents.safety.decision !== "COMPLIANT" ? "text-rose-400" : "text-emerald-400"}>{activeRoom.agents.safety.decision}</span></div>
                      <div><span className="text-zinc-500">RECOMMENDED ACTION:</span> <span className="text-indigo-400">{activeRoom.agents.safety.recommendedAction}</span></div>
                    </div>
                  </div>

                  {/* Facility Agent Card */}
                  <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl relative">
                    <div className="flex justify-between items-center mb-2 border-b border-zinc-900 pb-1.5">
                      <span className="text-xs font-bold text-zinc-300 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        FACILITY AGENT
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">CONF: {Math.round(activeRoom.agents.facility.confidence * 100)}%</span>
                    </div>
                    <div className="text-[11px] font-mono space-y-1">
                      <div><span className="text-zinc-500">OBSERVATION:</span> {activeRoom.agents.facility.observation}</div>
                      <div><span className="text-zinc-500">REASONING:</span> {activeRoom.agents.facility.reasoning}</div>
                      <div><span className="text-zinc-500">DECISION:</span> <span className="text-emerald-400">{activeRoom.agents.facility.decision}</span></div>
                      <div><span className="text-zinc-500">RECOMMENDED ACTION:</span> <span className="text-indigo-400">{activeRoom.agents.facility.recommendedAction}</span></div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Camera Feed & Live HUD (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-400 font-mono flex items-center gap-1.5">
                Target Sensor Feed Ingestion
              </h2>
              <span className="text-xs text-indigo-400 font-mono">ACTIVE: {selectedRoomId}</span>
            </div>

            <div className="h-[380px]">
              {simulationMode === "webcam" ? (
                <WebcamCapture
                  onFrameCapture={handleFrameCapture}
                  isProcessing={isProcessing}
                  intervalMs={sampleInterval}
                />
              ) : (
                <div className="relative flex flex-col w-full h-full overflow-hidden border rounded-2xl bg-zinc-950 border-zinc-800/80 backdrop-blur-xl">
                  {/* High-tech mock header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span>CAMPUS SIMULATION STREAM: ACTIVE</span>
                    </div>
                  </div>

                  <div className="relative flex-1 flex flex-col items-center justify-center bg-black/60 p-6 text-center">
                    {/* Scanning radar line */}
                    <div className="absolute inset-0 pointer-events-none border-t border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 to-transparent animate-scan" />

                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-500 mb-4 animate-pulse">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-sm font-semibold text-zinc-300 mb-1 font-mono uppercase">Telemetry Simulation Active</h3>
                    <p className="text-xs text-zinc-500 mb-4 max-w-xs">
                      Operations agent currently posting multi-modal data payloads directly to the ESM layer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Predictive Intelligence Insights Panel */}
            <div className="glass-panel p-5 rounded-2xl flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Predictive Intelligence Insights
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {insights.map((insight) => (
                    <div key={insight.id} className="p-3 bg-zinc-950/50 border border-zinc-900 rounded-lg text-xs font-mono">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-indigo-400">{insight.title}</span>
                        <span className="text-[9px] text-zinc-500">CONF: {insight.confidence}%</span>
                      </div>
                      <p className="text-zinc-400 leading-normal mb-1">{insight.message}</p>
                      <div className="text-[9px] text-emerald-400 font-bold">IMPACT: {insight.impact}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* ROW 3: Incident Tickets, Action Engine, and Event Timeline */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Incident Tickets (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3 flex items-center gap-1.5">
              Incident Ticket Manager
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {incidents.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8">No incident tickets logged.</div>
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
                      <span className="text-[9px] font-mono text-zinc-600">{new Date(ticket.timestamp).toLocaleTimeString()}</span>
                      {ticket.status === "active" && (
                        <button
                          onClick={() => resolveTicket(ticket.id)}
                          className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-bold transition-all cursor-pointer"
                        >
                          RESOLVE TICKET
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Engine Logs (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3 flex items-center gap-1.5">
              Action Orchestration Engine
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {actions.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8">Awaiting action deployments...</div>
              ) : (
                actions.map((action) => (
                  <div key={action.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg font-mono text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">{action.type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        action.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : action.status === "executing"
                            ? "bg-indigo-500/10 text-indigo-400 animate-pulse"
                            : action.status === "failed"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {action.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-zinc-500 text-[9px] mb-1">ID: {action.id} | TARGET: {action.roomId}</div>
                    <p className="text-zinc-400 mb-1 leading-relaxed">{action.details}</p>
                    <div className="text-[9px] text-zinc-600 text-right">{new Date(action.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Event Timeline (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col h-[380px]">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-300 font-mono border-b border-zinc-900 pb-2 mb-3 flex items-center gap-1.5">
              Campus Event Timeline
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
              {timeline.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-8">Waiting for events...</div>
              ) : (
                timeline.map((evt) => (
                  <div key={evt.id} className="flex gap-2.5 items-start p-1.5 rounded hover:bg-zinc-900/30 transition-colors">
                    <span className="text-zinc-600 text-[10px] whitespace-nowrap">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      evt.type === "critical" 
                        ? "bg-rose-500" 
                        : evt.type === "warning"
                          ? "bg-amber-500"
                          : evt.type === "action"
                            ? "bg-indigo-400"
                            : "bg-zinc-500"
                    }`} />
                    <div className="flex-1">
                      <span className="text-zinc-300 leading-normal">{evt.message}</span>
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
