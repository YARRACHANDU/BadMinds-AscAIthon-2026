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
  const [activeView, setActiveView] = useState<string>("overview");
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

  // Topology and Settings states
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [floorsList, setFloorsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  const [expandedBuildings, setExpandedBuildings] = useState<{ [key: string]: boolean }>({});
  const [expandedFloors, setExpandedFloors] = useState<{ [key: string]: boolean }>({});

  // Registration Form States
  const [newBuildingName, setNewBuildingName] = useState<string>("");

  const [newFloorBuildingId, setNewFloorBuildingId] = useState<string>("");
  const [newFloorName, setNewFloorName] = useState<string>("");

  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<string>("SUPER_ADMIN");

  const [newDeviceSpaceId, setNewDeviceSpaceId] = useState<string>("");
  const [newDeviceName, setNewDeviceName] = useState<string>("");
  const [newDeviceType, setNewDeviceType] = useState<string>("Camera");

  const [newSpaceName, setNewSpaceName] = useState<string>("");
  const [newSpaceType, setNewSpaceType] = useState<string>("Laboratory");
  const [newSpaceBuildingId, setNewSpaceBuildingId] = useState<string>("");
  const [newSpaceFloorId, setNewSpaceFloorId] = useState<string>("");
  const [newSpacePrimaryOwner, setNewSpacePrimaryOwner] = useState<string>("");
  const [newSpaceSecondaryOwner, setNewSpaceSecondaryOwner] = useState<string>("");
  const [newSpaceEscalationOwner, setNewSpaceEscalationOwner] = useState<string>("");
  const [newSpaceEmergencyOwner, setNewSpaceEmergencyOwner] = useState<string>("");
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  // Detection Debug Panel States
  const [debugFrameSent, setDebugFrameSent] = useState<string>("Never");
  const [debugApiResponse, setDebugApiResponse] = useState<string>("None");
  const [debugDetectedObjects, setDebugDetectedObjects] = useState<string>("None");
  const [debugConfidence, setDebugConfidence] = useState<string>("0%");
  const [debugOccupancyState, setDebugOccupancyState] = useState<string>("Empty");
  const [debugDecisionOutput, setDebugDecisionOutput] = useState<string>("No Action Required");

  const refreshSettingsLists = useCallback(async () => {
    try {
      const buildingsRes = await fetch(`${backendUrl}/api/buildings`);
      if (buildingsRes.ok) {
        const buildingsData = await buildingsRes.json();
        if (buildingsData.success) {
          setBuildingsList(buildingsData.buildings);
          if (buildingsData.buildings.length > 0 && !newFloorBuildingId) {
            setNewFloorBuildingId(buildingsData.buildings[0]._id);
          }
          if (buildingsData.buildings.length > 0 && !newSpaceBuildingId) {
            setNewSpaceBuildingId(buildingsData.buildings[0]._id);
          }
        }
      }

      const floorsRes = await fetch(`${backendUrl}/api/floors`);
      if (floorsRes.ok) {
        const floorsData = await floorsRes.json();
        if (floorsData.success) {
          setFloorsList(floorsData.floors);
          if (floorsData.floors.length > 0 && !newSpaceFloorId) {
            setNewSpaceFloorId(floorsData.floors[0]._id);
          }
        }
      }

      const usersRes = await fetch(`${backendUrl}/api/users`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsersList(usersData.users);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch settings lists:", err);
    }
  }, [backendUrl, newFloorBuildingId, newSpaceBuildingId, newSpaceFloorId]);

  useEffect(() => {
    refreshSettingsLists();
  }, [refreshSettingsLists]);

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBuildingName })
      });
      if (res.ok) {
        setNewBuildingName("");
        setToastMessage("Registered new building successfully.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshSettingsLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim() || !newFloorBuildingId) return;
    try {
      const res = await fetch(`${backendUrl}/api/floors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFloorName, buildingId: newFloorBuildingId })
      });
      if (res.ok) {
        setNewFloorName("");
        setToastMessage("Instantiated floor level successfully.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshSettingsLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    try {
      const res = await fetch(`${backendUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, role: newUserRole })
      });
      if (res.ok) {
        setNewUserName("");
        setNewUserEmail("");
        setToastMessage("Registered new operator successfully.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshSettingsLists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim() || !newDeviceSpaceId) return;
    try {
      const res = await fetch(`${backendUrl}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeviceName, type: newDeviceType, spaceId: newDeviceSpaceId })
      });
      if (res.ok) {
        setNewDeviceName("");
        setToastMessage("Mounted device actuator successfully.");
        setTimeout(() => setToastMessage(null), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || !newSpaceBuildingId || !newSpaceFloorId) return;
    try {
      const res = await fetch(`${backendUrl}/api/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpaceName,
          spaceType: newSpaceType,
          buildingId: newSpaceBuildingId,
          floorId: newSpaceFloorId,
          primaryOwner: newSpacePrimaryOwner || undefined,
          secondaryOwner: newSpaceSecondaryOwner || undefined,
          escalationOwner: newSpaceEscalationOwner || undefined,
          emergencyOwner: newSpaceEmergencyOwner || undefined
        })
      });
      if (res.ok) {
        setNewSpaceName("");
        setToastMessage("Created operational space successfully.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Build infrastructure topology tree
  const infraTree = React.useMemo(() => {
    const tree: {
      [buildingName: string]: {
        floors: {
          [floorName: string]: {
            spaces: RoomState[];
          };
        };
      };
    } = {};

    rooms.forEach(r => {
      const bName = r.facility || "General Area";
      const fName = r.floorName || "Floor 1";

      if (!tree[bName]) {
        tree[bName] = { floors: {} };
      }
      if (!tree[bName].floors[fName]) {
        tree[bName].floors[fName] = { spaces: [] };
      }
      tree[bName].floors[fName].spaces.push(r);
    });

    return tree;
  }, [rooms]);

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
    async (base64Image: string, detectedObjects: Array<{ label: string; confidence: number }> = []) => {
      if (isProcessing || simulationMode !== "webcam") return;
      setIsProcessing(true);
      setDebugFrameSent(new Date().toLocaleTimeString());

      try {
        const response = await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: selectedRoomId,
            image: base64Image,
            objects: detectedObjects
          })
        });

        if (response.ok) {
          const data = await response.json();
          setToastMessage(`INGESTED: Sensor update accepted for ${selectedRoomId}`);
          setTimeout(() => setToastMessage(null), 1000);

          if (data.success && data.roomState) {
            const room = data.roomState;
            setDebugApiResponse(JSON.stringify({ success: data.success, roomId: room.roomId, timestamp: new Date().toISOString() }, null, 2));
            setDebugDetectedObjects(
              room.detectedObjects && room.detectedObjects.length > 0
                ? room.detectedObjects.map((obj: string) => obj.charAt(0).toUpperCase() + obj.slice(1)).join(", ")
                : "None"
            );
            setDebugConfidence(`${room.occupancyConfidence || 100}%`);
            setDebugOccupancyState(room.occupancyStatus || "Empty");

            let decisionText = "No Action Required";
            if (room.agents?.security?.ruleTriggered && room.agents.security.ruleTriggered !== "None") {
              decisionText = room.agents.security.decision || "Security Alert";
            } else if (room.agents?.energy?.ruleTriggered && room.agents.energy.ruleTriggered !== "None") {
              decisionText = "Potential Energy Waste";
            } else if (room.agents?.safety?.ruleTriggered && room.agents.safety.ruleTriggered !== "None") {
              decisionText = "Safety Compliance Issue";
            }
            setDebugDecisionOutput(decisionText.replace(/_/g, " "));
          } else {
            setDebugApiResponse(`Status: ${response.status} (No roomState returned)`);
          }

          refreshState();
        } else {
          setDebugApiResponse(`Error status: ${response.status}`);
        }
      } catch (err: any) {
        console.warn("Frame capture pipeline failure:", err);
        setDebugApiResponse(`Error: ${err.message}`);
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
        const response = await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: targetId,
            image: "data:image/jpeg;base64,DEMO_INGEST_HUD",
            objects: mockObjects
          })
        });

        if (response.ok && targetId === selectedRoomId) {
          const data = await response.json();
          setDebugFrameSent(new Date().toLocaleTimeString() + " (Simulated)");
          if (data.success && data.roomState) {
            const room = data.roomState;
            setDebugApiResponse(JSON.stringify({ success: data.success, roomId: room.roomId, timestamp: new Date().toISOString() }, null, 2));
            setDebugDetectedObjects(
              room.detectedObjects && room.detectedObjects.length > 0
                ? room.detectedObjects.map((obj: string) => obj.charAt(0).toUpperCase() + obj.slice(1)).join(", ")
                : "None"
            );
            setDebugConfidence(`${room.occupancyConfidence || 100}%`);
            setDebugOccupancyState(room.occupancyStatus || "Empty");

            let decisionText = "No Action Required";
            if (room.agents?.security?.ruleTriggered && room.agents.security.ruleTriggered !== "None") {
              decisionText = room.agents.security.decision || "Security Alert";
            } else if (room.agents?.energy?.ruleTriggered && room.agents.energy.ruleTriggered !== "None") {
              decisionText = "Potential Energy Waste";
            } else if (room.agents?.safety?.ruleTriggered && room.agents.safety.ruleTriggered !== "None") {
              decisionText = "Safety Compliance Issue";
            }
            setDebugDecisionOutput(decisionText.replace(/_/g, " "));
          }
        }
        refreshState();
      } catch (err) {
        console.warn("Simulator push failed:", err);
      }
    }, sampleInterval);

    return () => clearInterval(simulatorInterval);
  }, [simulationMode, sampleInterval, rooms, backendUrl, refreshState, selectedRoomId]);

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


  const getActiveDecisionContext = (room: RoomState) => {
    if (!room) return { observation: "No active telemetry", reasoning: "System offline", decision: "NOMINAL" };
    
    // Find if there is an active incident in this room to highlight it
    const roomIncidents = incidents.filter(i => i.roomId === room.roomId && i.status === "active");
    if (roomIncidents.length > 0) {
      const inc = roomIncidents[0];
      return {
        observation: inc.description,
        reasoning: `Perceived evidence: ${inc.evidence?.detectedObjects?.join(", ") || "telemetry violation"}. Escalated to L${inc.escalationLevel || 1} officer.`,
        decision: `ALERT_${inc.severity}`
      };
    }

    // Otherwise check agents
    if (room.agents?.security?.decision && room.agents.security.decision !== "NOMINAL" && room.agents.security.decision !== "SECURE") {
      return {
        observation: room.agents.security.observation || "Possible security event",
        reasoning: room.agents.security.reasoning || "Analyzing movement profiles",
        decision: room.agents.security.decision
      };
    }

    if (room.agents?.energy?.decision && room.agents.energy.decision !== "NOMINAL" && room.agents.energy.decision !== "OPTIMIZED") {
      return {
        observation: room.agents.energy.observation || "Possible energy anomaly",
        reasoning: room.agents.energy.reasoning || "HVAC running in vacant room",
        decision: room.agents.energy.decision
      };
    }

    return {
      observation: room.agents?.security?.observation || "No anomalous presence or object profiles detected.",
      reasoning: room.agents?.security?.reasoning || "Environment complies with active security and safety policies.",
      decision: "NOMINAL"
    };
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans select-none overflow-hidden">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-[#0c0c0e] border border-zinc-900 text-zinc-350 px-4 py-3 rounded-lg shadow-2xl text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-900 bg-[#09090b] flex flex-col justify-between h-full font-sans">
        <div className="flex flex-col gap-8 p-6">
          
          {/* Logo / System Status */}
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>SentinelAI X</span>
              <span className={`w-2 h-2 rounded-full ${isCrisisMode ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
            </h1>
            <p className="text-[10px] text-zinc-555 tracking-wider uppercase font-semibold">Physical OS</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {(["overview", "perception", "incidents", "actions", "copilot"]).map((tab) => {
              const isActive = activeView === tab;
              const activeCount = tab === "incidents" ? incidents.filter(i => i.status === "active").length : 0;
              
              let label = tab === "overview" ? "Overview" 
                          : tab === "perception" ? "AI Perception Center"
                          : tab === "incidents" ? "Incidents"
                          : tab === "actions" ? "Action Log"
                          : "AI Copilot";

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveView(tab);
                    if (tab === "perception" && rooms.length > 0 && !selectedRoomId) {
                      setSelectedRoomId(rooms[0].roomId);
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                    isActive 
                      ? "bg-zinc-900 text-white font-bold" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <span>{label}</span>
                  {activeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Controls & Status */}
        <div className="p-6 border-t border-zinc-900 flex flex-col gap-5 bg-[#09090b]">
          
          {/* Feed Ingestion Source */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Telemetry Source</span>
            <div className="grid grid-cols-2 bg-zinc-900/40 p-0.5 rounded-lg border border-zinc-900">
              <button
                onClick={() => setSimulationMode("webcam")}
                className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  simulationMode === "webcam"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-350"
                }`}
              >
                Live Camera
              </button>
              <button
                onClick={() => setSimulationMode("demo")}
                className={`py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  simulationMode === "demo"
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-555 hover:text-zinc-350"
                }`}
              >
                Simulated Feed
              </button>
            </div>
          </div>

          {/* Emergency Protocols */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Emergency Protocols</span>
            {isCrisisMode ? (
              <button
                onClick={resetCrisisState}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 font-bold text-[10px] rounded-lg transition-all"
              >
                DISARM EMERGENCY
              </button>
            ) : (
              <button
                onClick={testCrisisState}
                className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 font-bold text-[10px] rounded-lg transition-all"
              >
                TRIGGER EMERGENCY
              </button>
            )}
          </div>

          {/* System Telemetry Metadata */}
          <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
            <span className="font-semibold">CLOCK</span>
            <span className="text-zinc-400 font-bold" suppressHydrationWarning>{systemClock || "--:--:--"}</span>
          </div>

        </div>
      </aside>

      {/* Main Content Frame */}
      <main className="flex-1 flex flex-col bg-[#09090b] overflow-y-auto">

        {/* Global Emergency Banner if Crisis is on */}
        {isCrisisMode && (
          <div className="bg-rose-500/5 border-b border-rose-500/10 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">CRITICAL EMERGENCY PROTOCOLS IN PROGRESS</span>
            </div>
            <span className="text-zinc-500 text-[10px] uppercase font-semibold">Autonomous lockouts engaged</span>
          </div>
        )}

        <div className="p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-8">
          
          {/* ==================== VIEW 1: OVERVIEW ==================== */}
          {activeView === "overview" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">Overview</h2>
                <p className="text-zinc-500 text-xs mt-1">Real-time situational flow of physical operations.</p>
              </div>

              {/* High-Impact 5-Step Story Flow Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. OBSERVE */}
                <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">1. OBSERVATION</span>
                  <span className="text-lg font-bold tracking-tight text-white">
                    {activeRoom?.detectedObjects && activeRoom.detectedObjects.length > 0
                      ? activeRoom.detectedObjects.map(obj => `1 ${obj.charAt(0).toUpperCase() + obj.slice(1)}`).join(", ")
                      : "None Detected"}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Confidence: {activeRoom?.occupancyConfidence || 100}%
                  </span>
                </div>

                {/* 2. UNDERSTAND */}
                <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">2. UNDERSTANDING</span>
                  <span className="text-lg font-bold tracking-tight text-white">
                    {activeRoom?.occupancyStatus === "Occupied" ? "Room Occupied" : "Room Empty"}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate">
                    Space: {activeRoom?.roomName || "Robotics Lab"}
                  </span>
                </div>

                {/* 3. DECIDE */}
                {(() => {
                  let decisionText = "No Action Required";
                  let reasonText = "Normal operations";

                  if (activeRoom?.agents?.security?.ruleTriggered && activeRoom.agents.security.ruleTriggered !== "None") {
                    decisionText = activeRoom.agents.security.decision || "Security Alert";
                    reasonText = "Security Rule Triggered";
                  } else if (activeRoom?.agents?.energy?.ruleTriggered && activeRoom.agents.energy.ruleTriggered !== "None") {
                    decisionText = "Potential Energy Waste";
                    reasonText = "Energy Rule Triggered";
                  } else if (activeRoom?.agents?.safety?.ruleTriggered && activeRoom.agents.safety.ruleTriggered !== "None") {
                    decisionText = "Safety Compliance Issue";
                    reasonText = "Safety Rule Triggered";
                  }

                  return (
                    <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                      <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">3. DECISION</span>
                      <span className={`text-lg font-bold tracking-tight ${decisionText === "No Action Required" ? "text-emerald-400" : "text-rose-400"}`}>
                        {decisionText.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate">
                        {reasonText}
                      </span>
                    </div>
                  );
                })()}

                {/* 4. ACT */}
                {(() => {
                  const latestAction = actions.find(a => a.roomId === activeRoom?.roomId) || actions[0];
                  let actionText = "Monitoring";
                  let statusText = "Active";

                  if (activeRoom?.agents?.security?.recommendedAction && activeRoom.agents.security.recommendedAction !== "CONTINUE_MONITORING" && activeRoom.agents.security.recommendedAction !== "NONE") {
                    actionText = activeRoom.agents.security.recommendedAction;
                    statusText = "Completed";
                  } else if (activeRoom?.agents?.energy?.recommendedAction && activeRoom.agents.energy.recommendedAction !== "NONE") {
                    actionText = activeRoom.agents.energy.recommendedAction;
                    statusText = "Completed";
                  } else if (latestAction) {
                    actionText = latestAction.type;
                    statusText = latestAction.status;
                  }

                  return (
                    <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                      <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">4. ACTION</span>
                      <span className="text-lg font-bold tracking-tight text-white truncate">
                        {actionText.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Status: {statusText}
                      </span>
                    </div>
                  );
                })()}

                {/* 5. IMPACT */}
                <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">5. IMPACT</span>
                  <span className="text-lg font-bold tracking-tight text-white">
                    {activeRoom?.occupancyStatus === "Occupied" ? "Operating Normally" : "Eco-Standby Active"}
                  </span>
                  <span className="text-[10px] text-emerald-400">
                    ₹{metrics.energySavedTodayINR || 240} saved today
                  </span>
                </div>
              </div>

              {/* Bottom Camera + Debug Panel Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* 1. Observation Panel (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-6">
                    <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">1. Current Observation</h3>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500 font-semibold uppercase">Live Feed</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-medium">Observe Space</label>
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-700"
                      >
                        {rooms.map((r) => (
                          <option key={r.roomId} value={r.roomId}>
                            {r.roomName} ({r.facility})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative aspect-video w-full bg-black rounded-lg border border-zinc-900 overflow-hidden flex items-center justify-center">
                      {simulationMode === "webcam" ? (
                        <WebcamCapture
                          onFrameCapture={handleFrameCapture}
                          isProcessing={isProcessing}
                          intervalMs={sampleInterval}
                        />
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center justify-center gap-2">
                          <span className="text-blue-500 text-xs font-semibold">Simulated Stream</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Feed Active</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-[10px] text-zinc-400 border border-zinc-800">
                        CAM_{activeRoom?.roomName?.toUpperCase().replace(/\s+/g, "_") || "ROBOTICS_LAB"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Space</span>
                        <span className="font-semibold text-white">{activeRoom?.roomName || "Robotics Lab"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Location</span>
                        <span className="font-semibold text-white">{activeRoom?.floorName || "Floor 1"}, {activeRoom?.facility || "Engineering Block"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Detected Objects</span>
                        <span className="font-semibold text-white font-mono text-emerald-400">
                          {activeRoom?.detectedObjects && activeRoom.detectedObjects.length > 0
                            ? activeRoom.detectedObjects.map(obj => `1 ${obj.charAt(0).toUpperCase() + obj.slice(1)}`).join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Occupancy</span>
                        <span className="font-semibold text-white font-mono text-emerald-400">{activeRoom?.occupancyStatus || "Empty"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2 border-t border-zinc-900 pt-3">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Confidence</span>
                        <span className="font-semibold text-emerald-500">{activeRoom?.occupancyConfidence || 100}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Debug & Pipeline Panel (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* DETECTION DEBUG PANEL */}
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4 shadow-sm">
                    <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Perception Debug Console</h3>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-zinc-500 font-mono font-medium">Pipeline: ONLINE</span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-4 text-xs font-mono">
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-900/60">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Frame Ingestion</span>
                        <span className="col-span-2 text-white text-right">{debugFrameSent}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-900/60">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Detections</span>
                        <span className="col-span-2 text-white font-bold text-right text-emerald-400">{debugDetectedObjects}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-900/60">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Confidence</span>
                        <span className="col-span-2 text-white font-bold text-right text-emerald-400">{debugConfidence}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-900/60">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Occupancy State</span>
                        <span className="col-span-2 text-white font-bold text-right text-emerald-400">{debugOccupancyState}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-zinc-900/60">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Decision Output</span>
                        <span className="col-span-2 text-white font-bold text-right text-emerald-400">{debugDecisionOutput}</span>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Ingest API Response</span>
                        <pre className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 text-[10px] text-zinc-400 overflow-x-auto max-h-[160px] font-mono leading-relaxed">
                          {debugApiResponse}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}          {/* ==================== VIEW 9: AI PERCEPTION CENTER ==================== */}
          {activeView === "perception" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">AI Perception Center</h2>
                <p className="text-zinc-500 text-xs mt-1">Live observation stream and spatial understanding mapping.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Camera & Spatial Info (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <div className="border-b border-zinc-900 pb-2">
                      <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Live Camera Stream</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-medium">Observe Space</label>
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-700"
                      >
                        {rooms.map((r) => (
                          <option key={r.roomId} value={r.roomId}>
                            {r.roomName} ({r.facility})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative aspect-video w-full bg-black rounded-lg border border-zinc-900 overflow-hidden flex items-center justify-center">
                      {simulationMode === "webcam" ? (
                        <WebcamCapture
                          onFrameCapture={handleFrameCapture}
                          isProcessing={isProcessing}
                          intervalMs={sampleInterval}
                        />
                      ) : (
                        <div className="text-center p-6 flex flex-col items-center justify-center gap-2">
                          <span className="text-blue-500 text-xs font-semibold">Simulated Stream</span>
                          <span className="text-[10px] text-zinc-555 uppercase tracking-widest">Feed Active</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-[10px] text-zinc-400 border border-zinc-800">
                        CAM_{activeRoom?.roomName?.toUpperCase().replace(/\s+/g, "_") || "ROBOTICS_LAB"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-3">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Detected Objects</span>
                        <span className="text-white font-bold">
                          {activeRoom?.detectedObjects && activeRoom.detectedObjects.length > 0
                            ? activeRoom.detectedObjects.map(obj => `1 ${obj.charAt(0).toUpperCase() + obj.slice(1)}`).join(", ")
                            : "No objects detected."}
                        </span>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Occupancy</span>
                        <span className="text-white font-bold">{activeRoom?.occupancyStatus || "Empty"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Space Information */}
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <div className="border-b border-zinc-900 pb-2">
                      <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Space Information</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Facility Name</span>
                        <span className="text-white font-semibold">{activeRoom?.facility || "Engineering Block"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Floor Level</span>
                        <span className="text-white font-semibold">{activeRoom?.floorName || "Floor 1"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: AI Understanding, Decision & Action (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* Current AI Understanding */}
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <div className="border-b border-zinc-900 pb-2">
                      <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Current AI Understanding</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      {[
                        { label: "Security", status: (activeRoom?.agents?.security as any)?.decision === "SECURE" || (activeRoom?.agents?.security as any)?.decision === "NOMINAL" ? "Normal" : "Alert" },
                        { label: "Energy", status: (activeRoom?.agents?.energy as any)?.decision === "OPTIMIZED" || (activeRoom?.agents?.energy as any)?.decision === "NOMINAL" ? "Normal" : "Alert" },
                        { label: "Safety", status: (activeRoom?.agents?.safety as any)?.decision === "COMPLIANT" || (activeRoom?.agents?.safety as any)?.decision === "NOMINAL" ? "Normal" : "Alert" },
                        { label: "Environment", status: (activeRoom?.agents?.facility as any)?.decision === "HEALTHY" || (activeRoom?.agents?.facility as any)?.decision === "NOMINAL" ? "Normal" : "Alert" }
                      ].map((item) => (
                        <div key={item.label} className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg flex flex-col gap-1">
                          <span className="text-zinc-500 font-bold uppercase text-[9px]">{item.label} Status</span>
                          <span className={`font-bold text-xs ${item.status === "Normal" ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Decision */}
                  {(() => {
                    let decisionText = "No Action Required";
                    let reasonText = "Occupancy matches room utilization.";

                    if (activeRoom?.agents?.security?.ruleTriggered && activeRoom.agents.security.ruleTriggered !== "None") {
                      decisionText = activeRoom.agents.security.decision || "Security Alert";
                      reasonText = activeRoom.agents.security.observation || "Restricted space occupancy violation.";
                    } else if (activeRoom?.agents?.energy?.ruleTriggered && activeRoom.agents.energy.ruleTriggered !== "None") {
                      decisionText = "Potential Energy Waste";
                      reasonText = "Room empty while devices remain active.";
                    } else if (activeRoom?.agents?.safety?.ruleTriggered && activeRoom.agents.safety.ruleTriggered !== "None") {
                      decisionText = "Safety Compliance Issue";
                      reasonText = activeRoom.agents.safety.observation || "Safety protocol alert.";
                    }

                    return (
                      <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                        <div className="border-b border-zinc-900 pb-2">
                          <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Current Decision</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Decision</span>
                            <span className={`font-bold text-sm ${decisionText === "No Action Required" ? "text-emerald-500" : "text-rose-500"}`}>
                              {decisionText.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Reason</span>
                            <span className="text-zinc-350 leading-relaxed">{reasonText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Current Action */}
                  {(() => {
                    const latestAction = actions.find(a => a.roomId === activeRoom?.roomId) || actions[0];
                    let actionText = "Monitor Environment";
                    let statusText = "Active";
                    let ownerText = "Facility Manager";

                    if (activeRoom?.agents?.security?.recommendedAction && activeRoom.agents.security.recommendedAction !== "CONTINUE_MONITORING" && activeRoom.agents.security.recommendedAction !== "NONE") {
                      actionText = activeRoom.agents.security.recommendedAction;
                      statusText = "Completed";
                      ownerText = "Security Officer";
                    } else if (activeRoom?.agents?.energy?.recommendedAction && activeRoom.agents.energy.recommendedAction !== "NONE") {
                      actionText = activeRoom.agents.energy.recommendedAction;
                      statusText = "Completed";
                      ownerText = "Facility Manager";
                    } else if (latestAction) {
                      actionText = latestAction.type;
                      statusText = latestAction.status;
                      ownerText = "Facility Manager";
                    }

                    return (
                      <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                        <div className="border-b border-zinc-900 pb-2">
                          <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Current Action</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Action</span>
                            <span className="text-white font-bold">{actionText.replace(/_/g, " ")}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Status</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              statusText.toLowerCase() === "completed" || statusText.toLowerCase() === "active"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse"
                            }`}>
                              {statusText.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Responsible Owner</span>
                            <span className="text-white font-medium">{ownerText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>

              </div>
            </div>
          )}

          {/* ==================== VIEW 4: INCIDENTS ==================== */}
          {activeView === "incidents" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">Incident Command Center</h2>
                <p className="text-zinc-500 text-xs mt-1">Audit active security violations, safety hazards, and compliance issues across spaces.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incidents.length === 0 ? (
                  <div className="col-span-3 text-center py-12 border border-zinc-900 rounded-xl text-zinc-500 text-xs">
                    No active incidents. Monitored environment is fully compliant.
                  </div>
                ) : (
                  incidents.map((ticket) => {
                    const matchRoom = rooms.find(r => r.roomId === ticket.roomId);
                    const locationLabel = matchRoom ? `${matchRoom.roomName} (${matchRoom.facility})` : "Campus Facility";
                    
                    const statusLabel = ticket.status === "active" ? "Investigating" : "Resolved";
                    const evidenceLabel = ticket.evidence?.detectedObjects?.join(", ") || ticket.description || "Telemetry anomaly";
                    const ownerLabel = ticket.status === "active" ? "Incident Response Team" : "Resolved";

                    return (
                      <div
                        key={ticket.id}
                        className={`bg-[#09090b] border p-6 rounded-xl flex flex-col gap-4 transition-all hover:border-zinc-800 ${
                          ticket.status === "active" 
                            ? "border-rose-900/40 bg-rose-950/5"
                            : "border-zinc-900 opacity-60"
                        }`}
                      >
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            ticket.status === "active" 
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}>
                            {statusLabel.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono" suppressHydrationWarning>
                            {new Date(ticket.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold">What Happened</span>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{ticket.title}</h4>
                        </div>

                        <div className="text-xs space-y-3 pt-2">
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Where It Happened</span>
                            <span className="text-white font-medium">{locationLabel}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Why It Happened (Evidence)</span>
                            <span className="text-zinc-350 leading-relaxed">{evidenceLabel}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Who Owns It</span>
                            <span className="text-white font-medium">{ownerLabel}</span>
                          </div>
                        </div>

                        {ticket.status === "active" && (
                          <button
                            onClick={() => resolveTicket(ticket.id)}
                            className="w-full mt-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold py-2 rounded-lg text-[10px] transition-all cursor-pointer"
                          >
                            Resolve Incident
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* ==================== VIEW 5: ACTION LOG ==================== */}
          {activeView === "actions" && (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">Action Log</h2>
                <p className="text-zinc-500 text-xs mt-1">Audit log of autonomous physical and system overrides executed across facilities.</p>
              </div>

              <div className="bg-[#09090b] border border-zinc-900 rounded-xl overflow-hidden text-xs">
                <table className="w-full border-collapse font-sans text-left">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Action</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Result</th>
                      <th className="p-4 text-right">Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {actions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-600">
                          No operations logged yet.
                        </td>
                      </tr>
                    ) : (
                      actions.map((act) => {
                        const isLight = act.type.includes("LIGHT");
                        const isDoor = act.type.includes("LOCK");
                        const impactText = isLight ? "₹14 Saved" : isDoor ? "Security Restored" : "Optimized";
                        
                        let reasonText = act.details || "Grid optimization cycle";
                        if (act.evidenceUsed) {
                          reasonText = `${reasonText} (${act.evidenceUsed})`;
                        }

                        return (
                          <tr key={act.id} className="hover:bg-zinc-900/10 text-zinc-300 transition-colors">
                            <td className="p-4 font-semibold text-white">
                              {act.type.replace(/_/g, " ")}
                            </td>
                            <td className="p-4 text-zinc-400">
                              {reasonText}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                act.status.toLowerCase() === "completed"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse"
                              }`}>
                                {act.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right text-emerald-500 font-bold">
                              {impactText}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}



          {/* ==================== VIEW 7: AI COPILOT ==================== */}
          {activeView === "copilot" && (
            <div className="flex flex-col max-w-4xl mx-auto w-full h-[650px] justify-between font-sans gap-6">
              
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">AI Executive Copilot</h2>
                <p className="text-zinc-500 text-xs mt-1">Converse directly with SentinelAI to query facility states and operational metrics.</p>
              </div>

              <div className="flex-1 bg-[#09090b] border border-zinc-900 rounded-xl flex flex-col justify-between overflow-hidden relative">
                
                {/* Message Flow */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {copilotMessages.map((msg, idx) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div key={idx} className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center flex-shrink-0 text-blue-500 font-bold text-xs">
                            AI
                          </div>
                        )}
                        <div className={`max-w-[70%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                          isUser 
                            ? "bg-zinc-900 text-white border border-zinc-800" 
                            : "bg-zinc-950 border border-zinc-900 text-zinc-300"
                        }`}>
                          <span className="text-[9px] font-bold block mb-1 uppercase tracking-wider text-zinc-500">
                            {isUser ? "You" : "SentinelAI"}
                          </span>
                          <p>{msg.text}</p>
                        </div>
                        {isUser && (
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 text-black font-bold text-xs">
                            U
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isCopilotTyping && (
                    <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center flex-shrink-0 text-blue-500 font-bold text-xs">
                        AI
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-zinc-500 animate-pulse text-xs">
                        Analyzing spatial parameters...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Footer Input Area */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-900/60 flex flex-col gap-4">
                  
                  {/* Suggested Prompts */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Which rooms are wasting energy?",
                      "Show unresolved incidents.",
                      "Who owns Robotics Lab?"
                    ].map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => setCopilotInput(prompt)}
                        className="px-3 py-1 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] rounded-full transition-all cursor-pointer font-sans"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleCopilotSubmit} className="flex gap-2 items-center bg-zinc-900/40 border border-zinc-850 rounded-xl px-4 py-2 focus-within:border-zinc-700 transition-colors">
                    <input
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      placeholder="Ask Copilot a question..."
                      className="flex-1 bg-transparent text-xs focus:outline-none placeholder-zinc-700 text-white py-1.5"
                    />
                    <button
                      type="submit"
                      className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 font-bold transition-all text-[10px] rounded-lg uppercase cursor-pointer"
                    >
                      Send
                    </button>
                  </form>

                </div>

              </div>

            </div>
          )}


        </div>

      </main>
    </div>
  );
}
