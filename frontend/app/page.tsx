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
  DeviceStates,
  Prediction,
  HealthScores,
  ComplianceReport,
  DailyReport,
  MemoryPatterns,
  SOPExecution,
  SOPTemplate
} from "../lib/types";

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:2005";

  // Dashboard Modes
  const [activeView, setActiveView] = useState<string>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [selectedBlock, setSelectedBlock] = useState<string>("Engineering Block");
  const [simulationMode, setSimulationMode] = useState<"webcam" | "demo">("webcam");
  const [sampleInterval, setSampleInterval] = useState<number>(3000);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("ROOM_ENG_101");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [systemClock, setSystemClock] = useState<string>("");

  // Voice Operations states
  const [voiceLanguage, setVoiceLanguage] = useState<"en" | "hi" | "te" | "ta">("en");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isContinuousVoiceMode, setIsContinuousVoiceMode] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; details?: any } | null>(null);

  const recognitionRef = useRef<any>(null);
  const announcedIncidentsRef = useRef<Set<string>>(new Set());
  const announcedWasteRoomsRef = useRef<Set<string>>(new Set());
  const initialFetchRef = useRef<boolean>(true);

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [healthScores, setHealthScores] = useState<HealthScores | null>(null);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [memoryPatterns, setMemoryPatterns] = useState<MemoryPatterns | null>(null);
  const [activeSops, setActiveSops] = useState<SOPExecution[]>([]);
  const [sopTemplates, setSopTemplates] = useState<SOPTemplate[]>([]);
  const [newCameraName, setNewCameraName] = useState<string>("");
  const [newCameraRtsp, setNewCameraRtsp] = useState<string>("");
  const [newCameraSpaceId, setNewCameraSpaceId] = useState<string>("");
  const [replayEventIndex, setReplayEventIndex] = useState<number | null>(null);

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
  const [currentDetections, setCurrentDetections] = useState<Array<{ label: string; confidence: number }>>([]);

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

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCameraName.trim() || !newCameraSpaceId) return;
    try {
      const res = await fetch(`${backendUrl}/api/cameras/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCameraName,
          rtspUrl: newCameraRtsp || undefined,
          spaceId: newCameraSpaceId
        })
      });
      if (res.ok) {
        setNewCameraName("");
        setNewCameraRtsp("");
        setToastMessage("CCTV Camera registered and auto-mapped.");
        setTimeout(() => setToastMessage(null), 2000);
        refreshState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSOP = async (sopName: string, spaceId: string) => {
    try {
      const res = await fetch(`${backendUrl}/api/sops/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopName, spaceId, triggeredBy: "manual_override" })
      });
      if (res.ok) {
        setToastMessage(`SOP Protocol [${sopName}] initialized on target.`);
        setTimeout(() => setToastMessage(null), 2000);
        refreshState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMockTelemetry = async (deviceId: string) => {
    try {
      const mockW = Math.round(50 + Math.random() * 400);
      const mockTemp = parseFloat((20 + Math.random() * 8).toFixed(1));
      const mockHum = Math.round(40 + Math.random() * 30);
      const mockBat = Math.round(80 + Math.random() * 20);

      const res = await fetch(`${backendUrl}/api/devices/${deviceId}/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          powerConsumptionW: mockW,
          temperature: mockTemp,
          humidity: mockHum,
          batteryLevel: mockBat
        })
      });
      if (res.ok) {
        setToastMessage("Mock telemetry packet ingested successfully.");
        setTimeout(() => setToastMessage(null), 1500);
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

  // Helper to fallback to database-reported objects with default confidence if live frame is not yet ingested
  const displayDetections = currentDetections.length > 0
    ? currentDetections
    : (activeRoom?.detectedObjects || []).map((obj: string) => ({ label: obj, confidence: 0.95 }));

  // Clear live detections on room switch to avoid cross-room contamination
  useEffect(() => {
    setCurrentDetections([]);
  }, [selectedRoomId]);

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

      // 7. Fetch Predictions
      const predictionsRes = await fetch(`${backendUrl}/api/predictions`);
      if (predictionsRes.ok) {
        const predictionsData = await predictionsRes.json();
        if (predictionsData.success) setPredictions(predictionsData.predictions);
      }

      // 8. Fetch Health Scores
      const healthRes = await fetch(`${backendUrl}/api/health-scores`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        if (healthData.success) setHealthScores(healthData.healthScores);
      }

      // 9. Fetch Compliance
      const complianceRes = await fetch(`${backendUrl}/api/compliance`);
      if (complianceRes.ok) {
        const complianceData = await complianceRes.json();
        if (complianceData.success) setComplianceReport(complianceData.report);
      }

      // 10. Fetch Active SOPs
      const sopsRes = await fetch(`${backendUrl}/api/sops/active`);
      if (sopsRes.ok) {
        const sopsData = await sopsRes.json();
        if (sopsData.success) setActiveSops(sopsData.active);
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
    async (
      base64Image: string,
      detectedObjects: Array<{ label: string; confidence: number }> = [],
      environmental?: any
    ) => {
      if (isProcessing || simulationMode !== "webcam") return;
      setIsProcessing(true);
      setDebugFrameSent(new Date().toLocaleTimeString());
      setCurrentDetections(detectedObjects);

      try {
        const response = await fetch(`${backendUrl}/api/perceive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: selectedRoomId,
            image: base64Image,
            objects: detectedObjects,
            environmental
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
              detectedObjects && detectedObjects.length > 0
                ? detectedObjects.map((obj) => `${obj.label.charAt(0).toUpperCase() + obj.label.slice(1)} (${Math.round(obj.confidence * 100)}%)`).join(", ")
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
          mockObjects.push({ label: "person", confidence: 0.99 });
        }
      } else if (targetId === "ROOM_HOS_MESS") {
        if (randVal > 0.4) {
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

      // Add environmental assets / physical inventory objects to the simulation
      const possibleAssets = [
        { label: "chair", confidence: 0.85 + Math.random() * 0.14 },
        { label: "laptop", confidence: 0.88 + Math.random() * 0.11 },
        { label: "tv", confidence: 0.90 + Math.random() * 0.09 },
        { label: "fan", confidence: 0.82 + Math.random() * 0.15 },
        { label: "door", confidence: 0.95 },
        { label: "monitor", confidence: 0.91 + Math.random() * 0.08 }
      ];
      // Randomly select 1 to 4 assets to add
      const numAssets = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numAssets; i++) {
        const asset = possibleAssets[Math.floor(Math.random() * possibleAssets.length)];
        if (!mockObjects.some(o => o.label === asset.label)) {
          mockObjects.push(asset);
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
          setCurrentDetections(mockObjects);
          if (data.success && data.roomState) {
            const room = data.roomState;
            setDebugApiResponse(JSON.stringify({ success: data.success, roomId: room.roomId, timestamp: new Date().toISOString() }, null, 2));
            setDebugDetectedObjects(
              mockObjects && mockObjects.length > 0
                ? mockObjects.map((obj) => `${obj.label.charAt(0).toUpperCase() + obj.label.slice(1)} (${Math.round(obj.confidence * 100)}%)`).join(", ")
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

  const voiceTranslations = {
    en: {
      energyWaste: (room: string) => `Attention. ${room} is currently empty while electrical devices remain active. Potential energy waste detected.`,
      unauthorizedAccess: (room: string) => `Warning. Unauthorized access detected in ${room}. Security team has been notified.`,
      safetyIncident: (block: string) => `Critical Alert. Safety risk detected in ${block}. Immediate attention required.`,
      actionLightsOff: (room: string) => `Lights in ${room} have been turned off successfully.`,
      actionFanOff: (room: string) => `Fan in ${room} has been switched off successfully.`,
      actionDoorLocked: (room: string) => `Door in ${room} has been locked successfully.`,
      actionDoorUnlocked: (room: string) => `Door in ${room} has been unlocked successfully.`,
      actionCompleted: "Action completed successfully.",
      commandReceived: (actionText: string) => `Command received. ${actionText}.`,
      confirmLockAll: "Please confirm. This action will lock all connected doors.",
      executingAction: "Executing action.",
      greeting: "Voice Operations activated. I am ready for your commands.",
      copilotError: "Sorry, I could not process that command.",
      noActiveIncidents: "All physical incidents have been resolved. Space operations are nominal.",
    },
    hi: {
      energyWaste: (room: string) => `ध्यान दें। ${room} इस समय खाली है लेकिन उपकरण चालू हैं। ऊर्जा की बर्बादी का पता चला है।`,
      unauthorizedAccess: (room: string) => `चेतावनी। ${room} में अनधिकृत प्रवेश का पता चला है। सुरक्षा टीम को सूचित कर दिया गया है।`,
      safetyIncident: (block: string) => `गंभीर चेतावनी। ${block} में सुरक्षा जोखिम का पता चला है। तत्काल ध्यान देने की आवश्यकता है।`,
      actionLightsOff: (room: string) => `${room} की लाइट सफलतापूर्वक बंद कर दी गई है।`,
      actionFanOff: (room: string) => `${room} का पंखा सफलतापूर्वक बंद कर दिया गया है।`,
      actionDoorLocked: (room: string) => `${room} का दरवाजा सफलतापूर्वक लॉक कर दिया गया है।`,
      actionDoorUnlocked: (room: string) => `${room} का दरवाजा सफलतापूर्वक अनलॉक कर दिया गया है।`,
      actionCompleted: "कार्य सफलतापूर्वक पूरा हुआ।",
      commandReceived: (actionText: string) => `आदेश प्राप्त हुआ। ${actionText}.`,
      confirmLockAll: "कृपया पुष्टि करें। यह क्रिया सभी जुड़े दरवाजों को लॉक कर देगी।",
      executingAction: "कार्य निष्पादित किया जा रहा है।",
      greeting: "वॉयस ऑपरेशंस सक्रिय। मैं आपके आदेशों के लिए तैयार हूं।",
      copilotError: "क्षमा करें, मैं उस आदेश को संसाधित नहीं कर सका।",
      noActiveIncidents: "सभी भौतिक घटनाएं सुलझा ली गई हैं। अंतरिक्ष संचालन सामान्य है।",
    },
    te: {
      energyWaste: (room: string) => `శ్రద్ధ. పరికరాలు సక్రియంగా ఉన్నప్పటికీ ${room} ప్రస్తుతం ఖాళీగా ఉంది. విద్యుత్ వృధా గుర్తించబడింది.`,
      unauthorizedAccess: (room: string) => `హెచ్చరిక. ${room} లో అనధికారిక ప్రవేశం గుర్తించబడింది. భద్రతా బృందానికి సమాచారం అందించబడింది.`,
      safetyIncident: (block: string) => `తీవ్రమైన హెచ్చరిక. ${block} లో భద్రతా ప్రమాదం గుర్తించబడింది. వెంటనే శ్రద్ధ వహించండి.`,
      actionLightsOff: (room: string) => `${room} లో లైట్లు విజయవంతంగా ఆపివేయబడ్డాయి.`,
      actionFanOff: (room: string) => `${room} లో ఫ్యాన్ విజయవంతంగా ఆపివేయబడింది.`,
      actionDoorLocked: (room: string) => `${room} తలుపు విజయవంతంగా లాక్ చేయబడింది.`,
      actionDoorUnlocked: (room: string) => `${room} తలుపు విజయవంతంగా అన్‌లాక్ చేయబడింది.`,
      actionCompleted: "పని విజయవంతంగా పూర్తయింది.",
      commandReceived: (actionText: string) => `ఆదేశం అందింది. ${actionText}.`,
      confirmLockAll: "దయచేసి ధృవీకరించండి. ఈ చర్య అన్ని కనెక్ట్ చేయబడిన తలుపులను లాక్ చేస్తుంది.",
      executingAction: "చర్యను అమలు చేస్తున్నాము.",
      greeting: "వాయిస్ ఆపరేషన్స్ ప్రారంభించబడ్డాయి. మీ ఆదేశాల కోసం సిద్ధంగా ఉన్నాను.",
      copilotError: "క్షమించండి, ఆ ఆదేశాన్ని ప్రాసెస్ చేయలేకపోయాను.",
      noActiveIncidents: "అన్ని భౌతిక సంఘటనలు పరిష్కరించబడ్డాయి. స్థల కార్యకలాపాలు సాధారణంగా ఉన్నాయి.",
    },
    ta: {
      energyWaste: (room: string) => `கவனம். சாதனங்கள் இயங்கும் நிலையில் ${room} தற்போது காலியாக உள்ளது. மின் விரயம் கண்டறியப்பட்டுள்ளது.`,
      unauthorizedAccess: (room: string) => `எச்சரிக்கை. ${room} இல் அங்கீகரிக்கப்படாத நுழைவு கண்டறியப்பட்டுள்ளது. பாதுகாப்பு குழுவிற்கு தகவல் தெரிவிக்கப்பட்டுள்ளது.`,
      safetyIncident: (block: string) => `முக்கிய எச்சரிக்கை. ${block} இல் பாதுகாப்பு ஆபத்து கண்டறியப்பட்டுள்ளது. உடனடி கவனம் தேவை.`,
      actionLightsOff: (room: string) => `${room} இல் விளக்குகள் வெற்றிகரமாக அணைக்கப்பட்டுள்ளன.`,
      actionFanOff: (room: string) => `${room} இல் மின்விசிறி வெற்றிகரமாக அணைக்கப்பட்டுள்ளது.`,
      actionDoorLocked: (room: string) => `${room} கதவு வெற்றிகரமாக பூட்டப்பட்டுள்ளது.`,
      actionDoorUnlocked: (room: string) => `${room} கதவு வெற்றிகரமாக திறக்கப்பட்டுள்ளது.`,
      actionCompleted: "செயல் வெற்றிகரமாக முடிந்தது.",
      commandReceived: (actionText: string) => `கட்டளை பெறப்பட்டது. ${actionText}.`,
      confirmLockAll: "தயவுசெய்து உறுதிப்படுத்தவும். இந்த செயல் இணைக்கப்பட்ட அனைத்து கதவுகளையும் பூட்டிவிடும்.",
      executingAction: "செயல்பாட்டை மேற்கொள்கிறது.",
      greeting: "குரல் செயல்பாடுகள் செயல்படுத்தப்பட்டன. உங்கள் கட்டளைகளுக்கு நான் தயார்.",
      copilotError: "மன்னிக்கவும், அந்த கட்டளையை செயல்படுத்த முடியவில்லை.",
      noActiveIncidents: "அனைத்து உடல்ரீதியான சம்பவங்களும் தீர்க்கப்பட்டுள்ளன. செயல்பாடுகள் சாதாரணமாக உள்ளன.",
    }
  };

  const speak = (text: string, callback?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      if (callback) callback();
      return;
    }

    // Cancel active speech to avoid queue buildup
    window.speechSynthesis.cancel();

    let langTag = "en-US";
    if (voiceLanguage === "hi") langTag = "hi-IN";
    else if (voiceLanguage === "te") langTag = "te-IN";
    else if (voiceLanguage === "ta") langTag = "ta-IN";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langTag;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(langTag));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      if (callback) callback();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error", e);
      if (callback) callback();
    };

    window.speechSynthesis.speak(utterance);
  };

  const startSpeechRecognition = (isContinuous: boolean) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setToastMessage("Speech recognition is not supported in this browser.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    if (voiceLanguage === "hi") rec.lang = "hi-IN";
    else if (voiceLanguage === "te") rec.lang = "te-IN";
    else if (voiceLanguage === "ta") rec.lang = "ta-IN";
    else rec.lang = "en-IN";

    rec.onstart = () => {
      if (isContinuous) {
        setIsContinuousVoiceMode(true);
      } else {
        setIsListening(true);
      }
    };

    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Speech Result:", transcript);
      await processVoiceCommand(transcript, isContinuous);
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      if (isContinuous) {
        // Restart on pause or no-speech
        setTimeout(() => {
          if (isContinuousVoiceMode) {
            startSpeechRecognition(true);
          }
        }, 1000);
      } else {
        setIsListening(false);
      }
    };

    rec.onend = () => {
      if (!isContinuous) {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const processVoiceCommand = async (transcript: string, isContinuous: boolean) => {
    const query = transcript.toLowerCase().trim();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const speakAndResume = (responseText: string) => {
      speak(responseText, () => {
        if (isContinuous && isContinuousVoiceMode) {
          startSpeechRecognition(true);
        }
      });
    };

    // 1. Check Pending Action Confirmation
    if (pendingAction) {
      const isConfirm = query.includes("confirm") || query.includes("yes") || query.includes("haa") || 
                        query.includes("avunu") || query.includes("aama") || query.includes("ok");
      const isCancel = query.includes("cancel") || query.includes("no") || query.includes("vadd") || 
                       query.includes("illai");

      if (isConfirm) {
        if (pendingAction.type === "LOCK_ALL") {
          try {
            const unlockedRooms = rooms.filter(r => !r.deviceStates.doorLocked);
            for (const r of unlockedRooms) {
              await fetch(`${backendUrl}/api/rooms/${r.roomId}/device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device: "doorLocked", state: true })
              });
            }
            refreshState();
            setPendingAction(null);
            speakAndResume("Action executed. All connected doors have been locked successfully.");
          } catch (e) {
            setPendingAction(null);
            speakAndResume("Error executing command.");
          }
        } else if (pendingAction.type === "SHUTDOWN_ALL") {
          try {
            for (const r of rooms) {
              if (r.deviceStates.lights) {
                await fetch(`${backendUrl}/api/rooms/${r.roomId}/device`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ device: "lights", state: false })
                });
              }
              if (r.deviceStates.fan) {
                await fetch(`${backendUrl}/api/rooms/${r.roomId}/device`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ device: "fan", state: false })
                });
              }
            }
            refreshState();
            setPendingAction(null);
            speakAndResume("Action executed. All lighting and HVAC systems have been powered down.");
          } catch (e) {
            setPendingAction(null);
            speakAndResume("Error executing command.");
          }
        }
        return;
      } else if (isCancel) {
        setPendingAction(null);
        speakAndResume("Action cancelled.");
        return;
      } else {
        speakAndResume("Please confirm the action by saying confirm or yes, or cancel by saying cancel.");
        return;
      }
    }

    // 2. Sensitive Action Triggers (Confirmation Needed)
    if (query.includes("lock all doors") || query.includes("lock all rooms")) {
      const unlockedCount = rooms.filter(r => !r.deviceStates.doorLocked).length;
      if (unlockedCount === 0) {
        speakAndResume("All doors are already locked.");
        return;
      }
      setPendingAction({ type: "LOCK_ALL" });
      const confirmText = voiceLanguage === "hi" ? `कृपया पुष्टि करें। यह क्रिया ${unlockedCount} जुड़े दरवाजों को लॉक कर देगी।`
                        : voiceLanguage === "te" ? `దయచేసి ధృవీకరించండి. ఈ చర్య ${unlockedCount} తలుపులను లాక్ చేస్తుంది.`
                        : voiceLanguage === "ta" ? `தயவுசெய்து உறுதிப்படுத்தவும். இந்த செயல் ${unlockedCount} கதவுகளை பூட்டிவிடும்.`
                        : `Please confirm. This action will lock ${unlockedCount} connected doors.`;
      speakAndResume(confirmText);
      return;
    }

    if (query.includes("turn off all lights") || query.includes("shutdown all devices")) {
      setPendingAction({ type: "SHUTDOWN_ALL" });
      const confirmText = voiceLanguage === "hi" ? "कृपया पुष्टि करें। यह क्रिया सभी लाइट और उपकरणों को बंद कर देगी।"
                        : voiceLanguage === "te" ? "దయచేసి ధృవీకరించండి. ఈ చర్య అన్ని లైట్లు మరియు ఫ్యాన్‌లను ఆపివేస్తుంది."
                        : voiceLanguage === "ta" ? "தயவுசெய்து உறுதிப்படுத்தவும். இந்த செயல் அனைத்து விளக்குகள் மற்றும் மின்விசிறிகளை அணைக்கும்."
                        : "Please confirm. This action will power off all lighting and fans.";
      speakAndResume(confirmText);
      return;
    }

    // 3. Direct Device Controls (turn off lights, lock door, etc.)
    const matchesTurnOffLights = query.includes("turn off light") || query.includes("lights off") || query.includes("switch off light");
    const matchesTurnOnLights = query.includes("turn on light") || query.includes("lights on") || query.includes("switch on light");
    const matchesTurnOffFan = query.includes("turn off fan") || query.includes("fan off") || query.includes("switch off fan");
    const matchesTurnOnFan = query.includes("turn on fan") || query.includes("fan on") || query.includes("switch on fan");
    const matchesLockDoor = query.includes("lock door") || query.includes("lock room") || query.includes("close room");
    const matchesUnlockDoor = query.includes("unlock door") || query.includes("unlock room") || query.includes("open room");

    if (matchesTurnOffLights || matchesTurnOnLights || matchesTurnOffFan || matchesTurnOnFan || matchesLockDoor || matchesUnlockDoor) {
      const targetRoom = rooms.find(r => {
        const name = r.roomName.toLowerCase();
        return query.includes(name) || name.split(' ').some(word => word.length > 3 && query.includes(word));
      });

      if (targetRoom) {
        let device: keyof DeviceStates | null = null;
        let targetState = false;
        let actionWord = "";

        if (matchesTurnOffLights) { device = "lights"; targetState = false; actionWord = "turning off lights"; }
        else if (matchesTurnOnLights) { device = "lights"; targetState = true; actionWord = "turning on lights"; }
        else if (matchesTurnOffFan) { device = "fan"; targetState = false; actionWord = "turning off fan"; }
        else if (matchesTurnOnFan) { device = "fan"; targetState = true; actionWord = "turning on fan"; }
        else if (matchesLockDoor) { device = "doorLocked"; targetState = true; actionWord = "locking door"; }
        else if (matchesUnlockDoor) { device = "doorLocked"; targetState = false; actionWord = "unlocking door"; }

        if (device) {
          const currentState = targetRoom.deviceStates[device];
          if (currentState === targetState) {
            const alreadyText = `The ${device === "doorLocked" ? "door" : device} in ${targetRoom.roomName} is already ${targetState ? (device === "doorLocked" ? "locked" : "on") : (device === "doorLocked" ? "unlocked" : "off")}.`;
            speakAndResume(alreadyText);
            return;
          }

          const ackText = `Command received. ${actionWord} in ${targetRoom.roomName}.`;
          speak(ackText, async () => {
            try {
              const response = await fetch(`${backendUrl}/api/rooms/${targetRoom.roomId}/device`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device, state: targetState })
              });
              if (response.ok) {
                refreshState();
                speakAndResume("Action completed successfully.");
              } else {
                speakAndResume("Action transmission failed.");
              }
            } catch (err) {
              speakAndResume("Failed to communicate with device actuator.");
            }
          });
          return;
        }
      } else {
        speakAndResume("I found the command, but could not identify the target room name in your request.");
        return;
      }
    }

    // 4. View Navigation Commands
    if (query.includes("show incident") || query.includes("go to incident") || query.includes("open incident")) {
      setActiveView("incidents");
      speakAndResume("Displaying active incident logs.");
      return;
    }
    if (query.includes("show heatmap") || query.includes("go to heatmap") || query.includes("open heatmap")) {
      setActiveView("heatmap");
      speakAndResume("Displaying campus energy and safety heatmap.");
      return;
    }
    if (query.includes("show daily report") || query.includes("generate daily report") || query.includes("show report") || query.includes("go to report")) {
      setActiveView("report");
      if (!dailyReport) {
        const r = await fetch(`${backendUrl}/api/report/daily`);
        const d = await r.json();
        if (d.success) setDailyReport(d.report);
      }
      speakAndResume("Generated today's operational report. Ready for export.");
      return;
    }
    if (query.includes("show overview") || query.includes("go to overview") || query.includes("open overview")) {
      setActiveView("overview");
      speakAndResume("Showing campus overview dashboard.");
      return;
    }
    if (query.includes("show compliance") || query.includes("go to compliance") || query.includes("open compliance")) {
      setActiveView("compliance");
      speakAndResume("Displaying regulatory safety and energy compliance scorecard.");
      return;
    }
    if (query.includes("show settings") || query.includes("go to settings") || query.includes("open settings")) {
      setActiveView("settings");
      speakAndResume("Opening physical system configurations.");
      return;
    }

    // 5. Operational Information Queries
    if (query.includes("energy was saved today") || query.includes("saved today") || query.includes("energy saved")) {
      const saved = metrics.energySavedTodayINR || 240;
      const text = voiceLanguage === "hi" ? `आज लगभग ${saved} रुपये की ऊर्जा बचत हुई है।`
                 : voiceLanguage === "te" ? `ఈరోజు అంచనా ప్రకారం ${saved} రూపాయల విద్యుత్ ఆదా చేయబడింది.`
                 : voiceLanguage === "ta" ? `இன்று சுமார் ${saved} ரூபாய் மின் சேமிப்பு செய்யப்பட்டுள்ளது.`
                 : `Energy savings today are estimated at ${saved} rupees.`;
      speakAndResume(text);
      return;
    }

    if (query.includes("rooms are occupied") || query.includes("which rooms are occupied") || query.includes("occupied rooms")) {
      const occupied = rooms.filter(r => r.occupancyStatus === "Occupied");
      if (occupied.length === 0) {
        speakAndResume("No rooms are currently occupied.");
      } else {
        const names = occupied.map(r => r.roomName).join(", ");
        speakAndResume(`The following rooms are currently occupied: ${names}.`);
      }
      return;
    }

    if (query.includes("daily ai briefing") || query.includes("ai briefing") || query.includes("briefing")) {
      playExecutiveBriefing();
      return;
    }

    // 6. Fallback to Copilot
    try {
      const response = await fetch(`${backendUrl}/api/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript })
      });

      if (response.ok) {
        const data = await response.json();
        speakAndResume(data.response);
      } else {
        speakAndResume("Sorry, I am having trouble connecting to the AI brain.");
      }
    } catch (err) {
      speakAndResume("Connection to the server failed. Please check network status.");
    }
  };

  const playExecutiveBriefing = () => {
    const health = healthScores?.campus?.score || 94;
    const monitoredCount = rooms.length || 12;
    const activeIncs = incidents.filter(i => i.status === "active").length;
    const energySaved = metrics.energySavedTodayINR || 240;

    let briefingText = "";
    if (voiceLanguage === "hi") {
      briefingText = `नमस्ते। आज हमारे पास ${monitoredCount} निगरानी की जाने वाली सुविधाएं हैं। ` +
                     `वर्तमान में ${activeIncs} सक्रिय घटनाएं हैं जिन पर ध्यान देने की आवश्यकता है। ` +
                     `आज अनुमानित ऊर्जा बचत ${energySaved} रुपये है। ` +
                     `कैंपस का स्वास्थ्य स्कोर ${health} प्रतिशत है। सुरक्षा स्थिति स्थिर है।`;
    } else if (voiceLanguage === "te") {
      briefingText = `నమస్కారం. ఈరోజు మనకు ${monitoredCount} పర్యవేక్షణ సౌకర్యాలు ఉన్నాయి. ` +
                     `ప్రస్తుతం ${activeIncs} క్రియాశీల సంఘటనలు శ్రద్ధ వహించాల్సి ఉంది. ` +
                     `ఈరోజు అంచనా వేసిన విద్యుత్ ఆదా ${energySaved} రూపాయలు. ` +
                     `క్యాంపస్ ఆరోగ్య స్కోరు ${health} శాతం. భద్రతా వ్యవస్థ సురక్షితంగా ఉంది.`;
    } else if (voiceLanguage === "ta") {
      briefingText = `வணக்கம். இன்று கண்காணிப்பில் ${monitoredCount} வசதிகள் உள்ளன. ` +
                     `${activeIncs} செயலில் உள்ள சம்பவங்கள் உங்கள் கவனத்திற்கு தேவைப்படுகின்றன. ` +
                     `இன்றைய மதிப்பிடப்பட்ட மின் சேமிப்பு ${energySaved} ரூபாய். ` +
                     `வளாகத்தின் சுகாதார மதிப்பீடு ${health} சதவீதம். பாதுகாப்பு நிலை சீராக உள்ளது.`;
    } else {
      briefingText = `Good morning. Today there are ${monitoredCount} monitored facilities. ` +
                     `${activeIncs > 0 ? `${activeIncs} active incidents require your attention.` : "No active incidents require attention."} ` +
                     `Energy savings today are estimated at ${energySaved} rupees. ` +
                     `Campus health score is ${health} percent. No critical security risks detected.`;
    }

    speak(briefingText, () => {
      if (isContinuousVoiceMode) {
        startSpeechRecognition(true);
      }
    });
  };

  // Real-time voice announcements hooks
  useEffect(() => {
    if (incidents.length === 0) return;
    
    if (initialFetchRef.current) {
      incidents.forEach(i => announcedIncidentsRef.current.add(i.id));
      initialFetchRef.current = false;
      return;
    }

    incidents.forEach(ticket => {
      if (ticket.status === "active" && !announcedIncidentsRef.current.has(ticket.id)) {
        announcedIncidentsRef.current.add(ticket.id);
        
        const matchRoom = rooms.find(r => r.roomId === ticket.roomId);
        const roomName = matchRoom ? matchRoom.roomName : "Campus Facility";

        if (ticket.severity === "CRITICAL") {
          let alertText = "";
          if (voiceLanguage === "hi") {
            alertText = `गंभीर चेतावनी। ${roomName} में सुरक्षा जोखिम का पता चला है। तत्काल ध्यान देने की आवश्यकता है।`;
          } else if (voiceLanguage === "te") {
            alertText = `తీవ్రమైన హెచ్చరిక. ${roomName} లో భద్రతా ప్రమాదం గుర్తించబడింది. వెంటనే శ్రద్ధ వహించండి.`;
          } else if (voiceLanguage === "ta") {
            alertText = `முக்கிய எச்சரிக்கை. ${roomName} இல் பாதுகாப்பு ஆபத்து கண்டறியப்பட்டுள்ளது. உடனடி கவனம் தேவை.`;
          } else {
            alertText = `Critical Alert. ${ticket.title} detected in ${roomName}. Immediate attention required.`;
          }
          speak(alertText);
          
          setManualCrisis(true);
          setAudioAlarmActive(true);
        } else if (ticket.severity === "HIGH") {
          let alertText = "";
          if (voiceLanguage === "hi") {
            alertText = `चेतावनी। ${roomName} में अनधिकृत गतिविधि देखी गई है।`;
          } else if (voiceLanguage === "te") {
            alertText = `హెచ్చరిక. ${roomName} లో అసాధారణ కార్యాచరణ కనుగొనబడింది.`;
          } else if (voiceLanguage === "ta") {
            alertText = `எச்சரிக்கை. ${roomName} இல் அசாதாரண செயல்பாடு கண்டறியப்பட்டுள்ளது.`;
          } else {
            alertText = `Warning. ${ticket.title} detected in ${roomName}.`;
          }
          speak(alertText);
        }
      }
    });
  }, [incidents, rooms, voiceLanguage]);

  useEffect(() => {
    rooms.forEach(r => {
      const isWasting = r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED";
      if (isWasting) {
        if (!announcedWasteRoomsRef.current.has(r.roomId)) {
          announcedWasteRoomsRef.current.add(r.roomId);
          
          let wasteText = "";
          if (voiceLanguage === "hi") {
            wasteText = `ध्यान दें। ${r.roomName} वर्तमान में खाली है लेकिन बिजली के उपकरण सक्रिय हैं। ऊर्जा की बर्बादी का पता चला है।`;
          } else if (voiceLanguage === "te") {
            wasteText = `శ్రద్ధ. విద్యుత్ పరికరాలు సక్రియంగా ఉన్నప్పటికీ ${r.roomName} ప్రస్తుతం ఖాళీగా ఉంది. విద్యుత్ వృధా కనుగొనబడింది.`;
          } else if (voiceLanguage === "ta") {
            wasteText = `கவணம். சாதனங்கள் இயங்கும் நிலையில் ${r.roomName} தற்போது காலியாக உள்ளது. மின் விரயம் கண்டறியப்பட்டுள்ளது.`;
          } else {
            wasteText = `Attention. ${r.roomName} is currently empty while electrical devices remain active. Potential energy waste detected.`;
          }
          speak(wasteText);
        }
      } else {
        announcedWasteRoomsRef.current.delete(r.roomId);
      }
    });
  }, [rooms, voiceLanguage]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans select-none overflow-hidden">
      
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] bg-[#0c0c0e] border border-zinc-900 text-zinc-350 px-4 py-3 rounded-lg shadow-2xl text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          {toastMessage}
        </div>
      )}

      {/* Voice Status HUD */}
      {(isListening || isContinuousVoiceMode) && (
        <div className="fixed bottom-6 right-6 z-[9998] bg-[#0c0c0e] border border-zinc-800 px-4 py-3 rounded-2xl shadow-2xl shadow-black/50 flex items-center gap-3">
          <div className={`flex items-center gap-2 ${isListening ? "text-rose-400" : "text-blue-400"}`}>
            <div className="relative flex items-center justify-center w-3 h-3">
              <div className={`w-3 h-3 rounded-full ${isListening ? "bg-rose-500" : "bg-blue-500"} animate-ping absolute opacity-75`} />
              <div className={`w-2 h-2 rounded-full ${isListening ? "bg-rose-500" : "bg-blue-500"} relative`} />
            </div>
            <span className="text-xs font-bold tracking-wide">
              {isListening ? "LISTENING" : "JARVIS ACTIVE"}
            </span>
          </div>
          {pendingAction && (
            <span className="text-[10px] text-amber-400 font-bold border-l border-zinc-700 pl-3 tracking-wider">
              CONFIRM?
            </span>
          )}
          <button
            onClick={() => {
              setIsListening(false);
              setIsContinuousVoiceMode(false);
              setPendingAction(null);
              if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
              window.speechSynthesis?.cancel();
            }}
            className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-900 bg-[#09090b] flex flex-col justify-between h-full font-sans transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col gap-8 p-6">
          
          {/* Logo / System Status */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>SentinelAI X</span>
                <span className={`w-2 h-2 rounded-full ${isCrisisMode ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
              </h1>
              <p className="text-[10px] text-zinc-555 tracking-wider uppercase font-semibold">Physical OS</p>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-zinc-500 hover:text-white md:hidden focus:outline-none"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {([
              { id: "overview",    label: "Overview" },
              { id: "command",     label: "Command Center" },
              { id: "perception",  label: "AI Perception" },
              { id: "heatmap",     label: "Campus Heatmap" },
              { id: "incidents",   label: "Incidents" },
              { id: "actions",     label: "Action Log" },
              { id: "compliance",  label: "Compliance" },
              { id: "report",      label: "Daily Report" },
              { id: "memory",      label: "AI Memory" },
              { id: "copilot",     label: "AI Copilot" },
              { id: "settings",    label: "Settings" },
            ]).map(({ id, label }) => {
              const isActive = activeView === id;
              const badge = id === "incidents" ? incidents.filter(i => i.status === "active").length
                          : id === "command" && predictions.length > 0 ? predictions.length
                          : 0;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActiveView(id);
                    setIsSidebarOpen(false);
                    if (id === "perception" && rooms.length > 0 && !selectedRoomId) setSelectedRoomId(rooms[0].roomId);
                    if (id === "report" && !dailyReport) {
                      fetch(`${backendUrl}/api/report/daily`).then(r => r.json()).then(d => { if (d.success) setDailyReport(d.report); });
                    }
                    if (id === "memory" && !memoryPatterns) {
                      fetch(`${backendUrl}/api/memory/patterns`).then(r => r.json()).then(d => { if (d.success) setMemoryPatterns(d.patterns); });
                    }
                    if (id === "settings") {
                      fetch(`${backendUrl}/api/sops`).then(r => r.json()).then(d => { if (d.success) setSopTemplates(d.templates); });
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-zinc-900 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                      {badge}
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

          {/* AI Voice Operations Widget */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center justify-between">
              <span>AI Voice Assistant</span>
              {isContinuousVoiceMode && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </span>

            {/* Mic + Continuous Mode row */}
            <div className="flex gap-2 items-center">
              <button
                id="btn-tap-to-speak"
                onClick={() => {
                  if (isListening) {
                    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
                    setIsListening(false);
                  } else {
                    startSpeechRecognition(false);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                  isListening
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-lg shadow-rose-500/5"
                    : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                }`}
              >
                <svg className={`w-3.5 h-3.5 ${isListening ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>{isListening ? "Listening..." : "Tap to Speak"}</span>
              </button>

              <button
                id="btn-jarvis-mode"
                onClick={() => {
                  if (isContinuousVoiceMode) {
                    setIsContinuousVoiceMode(false);
                    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
                    window.speechSynthesis?.cancel();
                  } else {
                    speak(voiceTranslations[voiceLanguage].greeting, () => startSpeechRecognition(true));
                  }
                }}
                title={isContinuousVoiceMode ? "Stop Jarvis Mode" : "Start Jarvis Continuous Mode"}
                className={`px-3 py-2 rounded-lg transition-all border flex items-center justify-center ${
                  isContinuousVoiceMode
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5"
                    : "bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>

            {/* Language + Briefing row */}
            <div className="flex gap-2">
              <select
                id="voice-language-selector"
                value={voiceLanguage}
                onChange={(e) => setVoiceLanguage(e.target.value as any)}
                className="flex-1 bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-350 font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="en">English (IN)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>

              <button
                id="btn-daily-briefing"
                onClick={playExecutiveBriefing}
                title="Daily AI Briefing"
                className="px-3 py-1.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-bold flex items-center gap-1.5 transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-5.536-9.536a5 5 0 000 7.072" />
                </svg>
                Briefing
              </button>
            </div>
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

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-900 md:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 text-zinc-400 hover:text-white focus:outline-none"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-bold text-white tracking-tight">SentinelAI X</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isCrisisMode ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            {systemClock || "--:--:--"}
          </div>
        </header>

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

        <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-8">
          
          {/* ==================== VIEW 1: OVERVIEW ==================== */}
          {activeView === "overview" && (
            <div className="flex flex-col gap-8 font-sans">
              <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">Overview</h2>
                <p className="text-zinc-500 text-xs mt-1">Real-time situational flow of physical operations.</p>
              </div>
              {/* Voice Quick Controls */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-overview-voice-speak"
                  onClick={() => {
                    if (isListening) {
                      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch(e){} }
                      setIsListening(false);
                    } else {
                      startSpeechRecognition(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isListening
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10"
                      : "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                  }`}
                >
                  <svg className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {isListening ? "Listening..." : "Voice Command"}
                </button>
                <button
                  id="btn-overview-briefing"
                  onClick={playExecutiveBriefing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-5.536-9.536a5 5 0 000 7.072" />
                  </svg>
                  AI Briefing
                </button>
              </div>
            </div>
              {/* High-Impact 5-Step Story Flow Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. OBSERVE */}
                <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2 shadow-sm">
                  <span className="text-[10px] tracking-wider font-semibold text-zinc-500 font-mono">1. OBSERVATION</span>
                  <span className="text-sm font-bold tracking-tight text-white line-clamp-2 min-h-[40px] flex items-center">
                    {displayDetections && displayDetections.length > 0
                      ? displayDetections.map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ")
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
                      <div className="flex flex-col gap-0.5 col-span-2 border-t border-b border-zinc-900 py-3">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Detected Objects</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {displayDetections && displayDetections.length > 0 ? (
                            displayDetections.map((d, idx) => (
                              <span key={idx} className="bg-zinc-950 border border-zinc-900 text-[10.5px] font-mono text-emerald-400 px-2 py-0.5 rounded">
                                {d.label.charAt(0).toUpperCase() + d.label.slice(1)} ({Math.round(d.confidence * 100)}%)
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500 font-mono text-[10px]">None</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold">Occupancy</span>
                        <span className="font-semibold text-white font-mono text-emerald-400">{activeRoom?.occupancyStatus || "Empty"}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
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

                      <div className="border-t border-zinc-900 pt-3 flex flex-col gap-2">
                        <span className="text-zinc-500 font-bold uppercase text-[9px]">Model Pipeline Status</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="bg-zinc-950 p-2 rounded border border-zinc-900 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">Person Detection</span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-1">
                              Active
                            </span>
                          </div>
                          <div className="bg-zinc-950 p-2 rounded border border-zinc-900 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">Object Detection</span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-1">
                              Active
                            </span>
                          </div>
                          <div className="bg-zinc-950 p-2 rounded border border-zinc-900 flex items-center justify-between text-[10px]">
                            <span className="text-zinc-400">Occupancy Engine</span>
                            <span className="text-emerald-500 font-semibold flex items-center gap-1">
                              Active
                            </span>
                          </div>
                        </div>
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

              {/* PHYSICAL ASSET INVENTORY */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4 shadow-sm mt-4">
                <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Physical Asset Inventory</h3>
                  <span className="text-[10px] text-zinc-500 font-mono font-medium">Auto-Syncing</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  {/* People */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">People</span>
                    <span className="text-lg font-bold text-white">
                      {displayDetections.filter(d => d.label.toLowerCase() === "person").length}
                    </span>
                    <span className="text-[9px] text-zinc-500 truncate">
                      {displayDetections.filter(d => d.label.toLowerCase() === "person")
                        .map(d => `Person (${Math.round(d.confidence * 100)}%)`).join(", ") || "None"}
                    </span>
                  </div>

                  {/* Furniture */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Furniture</span>
                    <span className="text-lg font-bold text-white">
                      {displayDetections.filter(d => 
                        ["chair", "couch", "table", "bed", "sofa", "dining table"].includes(d.label.toLowerCase())
                      ).length}
                    </span>
                    <span className="text-[9px] text-zinc-500 truncate">
                      {displayDetections.filter(d => 
                        ["chair", "couch", "table", "bed", "sofa", "dining table"].includes(d.label.toLowerCase())
                      ).map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ") || "None"}
                    </span>
                  </div>

                  {/* Electronics */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Electronics</span>
                    <span className="text-lg font-bold text-white">
                      {displayDetections.filter(d => 
                        ["laptop", "computer", "tv", "cell phone", "mouse", "keyboard", "monitor"].includes(d.label.toLowerCase())
                      ).length}
                    </span>
                    <span className="text-[9px] text-zinc-500 truncate">
                      {displayDetections.filter(d => 
                        ["laptop", "computer", "tv", "cell phone", "mouse", "keyboard", "monitor"].includes(d.label.toLowerCase())
                      ).map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ") || "None"}
                    </span>
                  </div>

                  {/* Infrastructure */}
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 flex flex-col gap-1">
                    <span className="text-zinc-500 font-bold uppercase text-[9px]">Infrastructure</span>
                    <span className="text-lg font-bold text-white">
                      {displayDetections.filter(d => 
                        ["door", "window", "wall", "ceiling", "light", "fan"].includes(d.label.toLowerCase())
                      ).length}
                    </span>
                    <span className="text-[9px] text-zinc-500 truncate">
                      {displayDetections.filter(d => 
                        ["door", "window", "wall", "ceiling", "light", "fan"].includes(d.label.toLowerCase())
                      ).map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ") || "None"}
                    </span>
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
                      {activeRoom?.environmental?.brightnessLevel !== undefined ? (
                        <>
                          <div className="col-span-2">
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Objects</span>
                            <span className="text-white font-bold">
                              {displayDetections && displayDetections.length > 0
                                ? displayDetections.map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ")
                                : "None"}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Environment</span>
                            <span className="text-white font-bold">
                              {activeRoom?.environmental?.lightingCondition || "Normal"}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Lighting</span>
                            <span className="text-white font-bold">
                              {activeRoom?.environmental?.lightingStatus || "Unknown"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Detected Objects</span>
                            <span className="text-white font-bold">
                              {displayDetections && displayDetections.length > 0
                                ? displayDetections.map(d => `${d.label.charAt(0).toUpperCase() + d.label.slice(1)} (${Math.round(d.confidence * 100)}%)`).join(", ")
                                : "No objects detected."}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Occupancy</span>
                            <span className="text-white font-bold">{activeRoom?.occupancyStatus || "Empty"}</span>
                          </div>
                        </>
                      )}
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

                  {/* Environmental Intelligence */}
                  <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                      <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Environmental Intelligence</span>
                      <span className="text-[9px] text-zinc-500 font-mono font-medium">Real-Time Insights</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Brightness</span>
                        <span className="text-white font-bold font-mono">
                          {activeRoom?.environmental?.brightnessLevel ?? 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Lighting Status</span>
                        <span className="text-white font-semibold">
                          {activeRoom?.environmental?.lightingStatus || "Likely OFF"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Motion Activity</span>
                        <span className="text-white font-semibold">
                          {activeRoom?.environmental?.motionActivity || "None"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Fan Activity</span>
                        <span className={`font-semibold ${activeRoom?.environmental?.fanActivity === "Detected" ? "text-emerald-400 font-bold" : "text-white"}`}>
                          {activeRoom?.environmental?.fanActivity || "Not Detected"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Occupancy</span>
                        <span className="text-white font-semibold">
                          {activeRoom?.occupancyStatus || "Empty"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Energy Status</span>
                        <span className={`font-bold ${
                          activeRoom?.environmental?.energyEfficiencyState === "Potential Waste" 
                            ? "text-rose-400" 
                            : activeRoom?.environmental?.energyEfficiencyState === "Insufficient Lighting" 
                              ? "text-amber-400" 
                              : "text-emerald-400"
                        }`}>
                          {activeRoom?.environmental?.energyEfficiencyState || "Normal Operation"}
                        </span>
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
                    const locationLabel = matchRoom ? `${matchRoom.roomName} (${matchRoom.facility})` : ticket.roomId || "Campus Facility";
                    
                    const statusLabel = ticket.status === "active" ? "Investigating" : "Resolved";
                    const evidenceLabel = ticket.evidence?.detectedObjects?.join(", ") || ticket.description || "Telemetry anomaly";
                    const ownerLabel = ticket.assignedUser || "Unassigned";

                    // Find if there is an active SOP running for this space
                    const runningSOP = activeSops.find(s => s.spaceId === ticket.roomId && s.status === "running");

                    return (
                      <div
                        key={ticket.id}
                        className={`bg-[#09090b] border p-6 rounded-xl flex flex-col justify-between transition-all hover:border-zinc-800 ${
                          ticket.status === "active" 
                            ? "border-rose-900/40 bg-rose-950/5 shadow-[0_0_15px_rgba(244,63,94,0.03)]"
                            : "border-zinc-900 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-3">
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

                          <div className="flex justify-between items-start gap-2 mb-3">
                            <div className="space-y-1">
                              <span className="text-[9px] text-zinc-500 uppercase font-bold">What Happened</span>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{ticket.title}</h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              ticket.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                              : ticket.severity === "HIGH" ? "bg-orange-500/25 text-orange-400 border border-orange-500/30"
                              : ticket.severity === "MEDIUM" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {ticket.severity}
                            </span>
                          </div>

                          <div className="text-xs space-y-3 pt-2">
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Where It Happened</span>
                              <span className="text-white font-medium">{locationLabel}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Why It Happened (Evidence)</span>
                              <span className="text-zinc-350 leading-relaxed block max-h-[40px] overflow-y-auto pr-1">{evidenceLabel}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-zinc-900/60 pt-2">
                              <div>
                                <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Assigned Owner</span>
                                <span className="text-white font-medium">{ownerLabel}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">Escalation Level</span>
                                <span className="text-white font-medium font-mono">L{ticket.escalationLevel || 1} SLA</span>
                              </div>
                            </div>
                          </div>

                          {/* Active SOP Indicator */}
                          {runningSOP && (
                            <div className="mt-4 p-3 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-1.5">
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-emerald-400 font-bold uppercase tracking-wider animate-pulse">Running SOP Protocol</span>
                                <span className="text-zinc-500 font-bold">{runningSOP.completedSteps.length}/{runningSOP.totalSteps} Steps</span>
                              </div>
                              <span className="text-[10px] text-white font-bold">{runningSOP.templateName}</span>
                              {/* Progress bar */}
                              <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${(runningSOP.completedSteps.length / runningSOP.totalSteps) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {ticket.status === "active" && (
                          <div className="mt-5 flex gap-2">
                            <button
                              onClick={() => resolveTicket(ticket.id)}
                              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white font-semibold py-2 rounded-lg text-[10px] transition-all cursor-pointer uppercase"
                            >
                              Resolve Ticket
                            </button>
                          </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-sans text-left min-w-[600px] md:min-w-0">
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
            </div>
          )}

          {/* ==================== VIEW: COMMAND CENTER ==================== */}
          {activeView === "command" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Executive Command Center</h2>
                <p className="text-zinc-500 text-xs mt-1">Spatio-temporal intelligence, proactive capacity forecasts, and autonomous SOP orchestration.</p>
              </div>

              {/* Health Score Overview */}
              {healthScores ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Campus Health Score</span>
                    <span className="text-3xl font-extrabold text-white font-mono">{healthScores.campus.score}/100</span>
                    <span className={`text-xs font-bold ${healthScores.campus.status === "Healthy" ? "text-emerald-500" : "text-amber-500"}`}>
                      Grade {healthScores.campus.grade} &bull; {healthScores.campus.status}
                    </span>
                  </div>
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Monitored Spaces</span>
                    <span className="text-3xl font-extrabold text-white font-mono">{healthScores.campus.totalRooms} Rooms</span>
                    <span className="text-xs text-zinc-400">
                      {healthScores.campus.healthyRooms} Healthy &bull; {healthScores.campus.warningRooms} Warnings
                    </span>
                  </div>
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Operations</span>
                    <span className="text-3xl font-extrabold text-white font-mono">{healthScores.campus.totalActiveIncidents} Alerts</span>
                    <span className="text-xs text-rose-400 font-bold">
                      {healthScores.campus.criticalIncidents} Critical severity incidents
                    </span>
                  </div>
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-5 flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Predictive Insights</span>
                    <span className="text-3xl font-extrabold text-amber-400 font-mono">{predictions.length} Active</span>
                    <span className="text-xs text-zinc-400">Proactive actions recommendations ready</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs">Loading health scorecard...</div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Predictions & capacity forecasts (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Predictive Operations Engine</h3>
                    <div className="divide-y divide-zinc-900">
                      {predictions.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-4">No capacity anomalies or security risks forecasted.</p>
                      ) : (
                        predictions.map(p => (
                          <div key={p.id} className="py-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded mr-2 ${
                                  p.category === "security" ? "bg-rose-500/10 text-rose-500"
                                  : p.category === "energy" ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-blue-500/10 text-blue-500"
                                }`}>
                                  {p.category.toUpperCase()}
                                </span>
                                <span className="text-xs font-bold text-white">{p.roomName}</span>
                              </div>
                              <span className="text-xs font-semibold text-zinc-400">{p.confidence * 100}% Conf.</span>
                            </div>
                            <p className="text-xs text-zinc-300 font-medium">{p.prediction}</p>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1">
                              <span>Expected in ~{p.expectedTimeMinutes} mins</span>
                              <span className="text-amber-500 font-bold">Action: {p.recommendedAction.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Active SOP Orchestrations */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">SOP Execution Audits</h3>
                    <div className="flex flex-col gap-3">
                      {activeSops.length === 0 ? (
                        <span className="text-xs text-zinc-500">No SOP templates executing. System is in nominal standby state.</span>
                      ) : (
                        activeSops.map(sop => {
                          const room = rooms.find(r => r.roomId === sop.spaceId);
                          return (
                            <div key={sop.executionId} className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white">{sop.sopName}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sop.status === "running" ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"}`}>
                                  {sop.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                Target Space: {room ? room.roomName : sop.spaceId} &bull; Started: {new Date(sop.startTime).toLocaleTimeString()}
                              </div>
                              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-1.5" style={{ width: `${(sop.completedSteps.length / sop.totalSteps) * 100}%` }} />
                              </div>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {Array.from({ length: sop.totalSteps }).map((_, i) => {
                                  const stepNum = i + 1;
                                  const isDone = sop.completedSteps.includes(stepNum);
                                  return (
                                    <span key={stepNum} className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center border ${
                                      isDone ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                    }`}>
                                      {stepNum}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Building Scores & SOP list (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Building Standings */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Campus Blocks Standings</h3>
                    <div className="flex flex-col gap-3">
                      {healthScores?.buildings.map(b => (
                        <div key={b.name} className="flex justify-between items-center text-xs p-3 bg-zinc-950/60 rounded-lg border border-zinc-900/60">
                          <div>
                            <span className="font-bold text-white block">{b.name}</span>
                            <span className="text-[10px] text-zinc-500">{b.roomCount} spaces monitored &bull; {b.criticalRooms} critical</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-white font-mono">{b.score}</span>
                            <span className={`block text-[9px] font-bold ${b.status === "Healthy" ? "text-emerald-500" : b.status === "Warning" ? "text-amber-500" : "text-rose-500"}`}>
                              {b.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manual SOP Execution trigger */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col gap-4">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Manual SOP Dispatch</h3>
                    <p className="text-[11px] text-zinc-500">Initiate structured multi-agent emergency/energy override sequences on specific spaces.</p>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">SOP Protocol Template</label>
                      <select id="sopManualSelect" className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg p-2">
                        <option value="unauthorized_access">Unauthorized Access Sequence</option>
                        <option value="energy_waste_shutdown">Active Device Shutoff Protocol</option>
                        <option value="safety_blockage_clearance">Safety Exit Blockage Alert</option>
                        <option value="extreme_heat_mitigation">Extreme Heat Ventilation Sequence</option>
                        <option value="poor_air_quality_alert">Critical Air Quality Ventilation</option>
                      </select>

                      <label className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Target Space</label>
                      <select id="sopManualSpace" className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg p-2">
                        {rooms.map(r => (
                          <option key={r.roomId} value={r.roomId}>{r.roomName} ({r.facility})</option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const name = (document.getElementById("sopManualSelect") as HTMLSelectElement).value;
                          const space = (document.getElementById("sopManualSpace") as HTMLSelectElement).value;
                          handleTriggerSOP(name, space);
                        }}
                        className="mt-3 w-full py-2 bg-white text-black font-extrabold text-[10px] rounded-lg hover:bg-zinc-200 transition-all uppercase"
                      >
                        Dispatch SOP Sequence
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VIEW: CAMPUS HEATMAP ==================== */}
          {activeView === "heatmap" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Smart Campus Heatmap</h2>
                <p className="text-zinc-500 text-xs mt-1">Spatial grid representation of operational health, occupancy, and risk conditions.</p>
              </div>

              <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col gap-6">
                {/* SVG Space Grid */}
                <div className="w-full flex justify-center items-center p-8 bg-zinc-950 border border-zinc-900/60 rounded-lg overflow-x-auto min-h-[450px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-4xl">
                    {rooms.map((room) => {
                      const activeIncs = incidents.filter(i => i.roomId === room.roomId && i.status === "active");
                      const roomHealth = healthScores?.rooms.find(r => r.roomId === room.roomId);
                      const displayScore = roomHealth ? roomHealth.score : (room.riskLevel === "CRITICAL" ? 20 : room.riskLevel === "HIGH" ? 50 : room.riskLevel === "MEDIUM" ? 75 : 98);
                      
                      let heatBg = "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 text-emerald-400";
                      if (room.riskLevel === "CRITICAL") heatBg = "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60 text-rose-400 animate-pulse";
                      else if (room.riskLevel === "HIGH" || room.riskLevel === "MEDIUM") heatBg = "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 text-amber-400";

                      return (
                        <div
                          key={room.roomId}
                          onClick={() => {
                            setSelectedRoomId(room.roomId);
                            setActiveView("perception");
                          }}
                          className={`p-5 border rounded-xl flex flex-col justify-between h-[150px] cursor-pointer transition-all hover:scale-[1.02] ${heatBg}`}
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider truncate max-w-[120px]">{room.roomName}</span>
                              <span className="text-[10px] font-mono font-bold bg-black/40 px-1.5 py-0.5 rounded border border-zinc-800">{displayScore} pts</span>
                            </div>
                            <span className="text-[9px] text-zinc-500 block uppercase mt-0.5">{room.facility}</span>
                          </div>

                          <div className="text-xs pt-4 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-500 font-medium">Occupancy:</span>
                              <span className="text-white font-bold">{room.peopleCount} Pers. ({room.occupancyStatus})</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-zinc-500 font-medium">Energy Use:</span>
                              <span className="text-white font-mono font-semibold">{room.deviceStates.lights ? "Lights ON" : "Lights OFF"} &bull; {room.deviceStates.fan ? "Fan ON" : "Fan OFF"}</span>
                            </div>
                            {activeIncs.length > 0 && (
                              <span className="text-[9px] bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded px-1.5 py-0.5 mt-2 font-bold text-center uppercase tracking-wider">
                                {activeIncs.length} Active Alert
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex justify-between items-center text-xs text-zinc-500 border-t border-zinc-900 pt-4">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/40" /> Healthy (90-100 pts)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/40" /> Warning (60-89 pts)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/15 border border-rose-500/50 animate-pulse" /> Critical (&lt;60 pts)</span>
                  </div>
                  <span>Click block space to dispatch camera perception view</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VIEW: COMPLIANCE ==================== */}
          {activeView === "compliance" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">AI Compliance Auditor</h2>
                <p className="text-zinc-500 text-xs mt-1">Autonomous checks auditing restricted access, blockage hazards, and energy efficiency parameters.</p>
              </div>

              {complianceReport ? (
                <div className="flex flex-col gap-6">
                  {/* Top Summary Score */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="40" cy="40" r="34" className="stroke-zinc-900 fill-none" strokeWidth="6" />
                          <circle cx="40" cy="40" r="34" className="stroke-emerald-500 fill-none transition-all duration-1000" strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 34}
                            strokeDashoffset={2 * Math.PI * 34 * (1 - complianceReport.overallComplianceScore / 100)} />
                        </svg>
                        <span className="absolute text-sm font-extrabold text-white font-mono">{complianceReport.overallComplianceScore}%</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Overall Compliance Rating</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Audited {complianceReport.summary.totalRoomsAudited} rooms, {complianceReport.summary.totalChecks} parameter points check.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-center">
                        <span className="text-zinc-500 uppercase font-bold text-[9px] block">Compliant</span>
                        <span className="text-white font-extrabold text-sm font-mono">{complianceReport.summary.compliantRooms}</span>
                      </div>
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-center">
                        <span className="text-zinc-500 uppercase font-bold text-[9px] block">Partial</span>
                        <span className="text-amber-500 font-extrabold text-sm font-mono">{complianceReport.summary.partialRooms}</span>
                      </div>
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-center">
                        <span className="text-zinc-500 uppercase font-bold text-[9px] block">Violated</span>
                        <span className="text-rose-500 font-extrabold text-sm font-mono">{complianceReport.summary.nonCompliantRooms}</span>
                      </div>
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-center">
                        <span className="text-zinc-500 uppercase font-bold text-[9px] block">Passed Checks</span>
                        <span className="text-emerald-500 font-extrabold text-sm font-mono">{complianceReport.summary.totalPassed}/{complianceReport.summary.totalChecks}</span>
                      </div>
                    </div>
                  </div>

                  {/* Room violations listing */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Space Audits & Policy Violations</h3>
                    <div className="divide-y divide-zinc-900">
                      {complianceReport.rooms.map(room => (
                        <div key={room.roomId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{room.roomName}</span>
                              <span className="text-[10px] text-zinc-500 font-medium">({room.facility})</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {room.violations.length === 0 ? (
                                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                                  &bull; Meets all active safety and security compliance conditions
                                </span>
                              ) : (
                                room.violations.map(v => (
                                  <span key={v.ruleId} className="text-[9px] px-2 py-0.5 rounded border border-rose-950 bg-rose-950/20 text-rose-400 font-bold">
                                    {v.title}: {v.violation}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-white font-mono block">{room.complianceScore}% Score</span>
                            <span className={`text-[9px] uppercase font-bold ${
                              room.status === "Compliant" ? "text-emerald-500"
                              : room.status === "Partial" ? "text-amber-500"
                              : "text-rose-500 animate-pulse"
                            }`}>
                              {room.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-zinc-900 rounded-xl text-zinc-500 text-xs">Loading Compliance Audits...</div>
              )}
            </div>
          )}

          {/* ==================== VIEW: DAILY REPORT ==================== */}
          {activeView === "report" && (
            <div className="flex flex-col gap-8 font-sans max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Daily Operational Report</h2>
                  <p className="text-zinc-500 text-xs mt-1">Structured PDF-ready summary of campus efficiency, ESG achievements, and ROI statistics.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 px-4 py-2 rounded-lg text-xs font-semibold transition-all self-start sm:self-auto"
                >
                  Print / Export PDF
                </button>
              </div>

              {dailyReport ? (
                <div className="bg-[#0c0c0e] border border-zinc-900 rounded-2xl p-8 flex flex-col gap-8 text-xs text-zinc-300">
                  <div className="border-b border-zinc-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-lg font-bold text-white">{dailyReport.reportTitle}</h1>
                      <p className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase mt-1">Period: {dailyReport.period} &bull; Generated: {new Date(dailyReport.generatedAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Campus Health Status</span>
                      <span className="block text-lg font-extrabold text-emerald-400">{dailyReport.executiveSummary.campusStatus} ({dailyReport.executiveSummary.campusHealthScore} pts)</span>
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Energy & ESG ROI */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-white tracking-wider border-b border-zinc-900 pb-2">1. Energy Savings & ESG Achievements</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Estimated Saved Today</span>
                          <span className="text-lg font-extrabold text-white font-mono">₹{dailyReport.energy.savedTodayINR}</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Projected Annual Savings</span>
                          <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{dailyReport.energy.projectedAnnualINR}</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Carbon Footprint Saved</span>
                          <span className="text-lg font-extrabold text-white font-mono">{dailyReport.energy.carbonReducedKg} kg CO2</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Equivalent Trees Saved</span>
                          <span className="text-lg font-extrabold text-emerald-500 font-mono">{dailyReport.energy.equivalentTreesSaved} Trees</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Shutoff automation triggered <strong className="text-white">{dailyReport.energy.automatedShutdowns} times</strong> today in vacant rooms.
                      </div>
                    </div>

                    {/* Incidents & Actions summary */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-white tracking-wider border-b border-zinc-900 pb-2">2. Incident Dispatch Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Today Total Incidents</span>
                          <span className="text-lg font-extrabold text-white font-mono">{dailyReport.incidents.todayTotal}</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Resolved Today</span>
                          <span className="text-lg font-extrabold text-emerald-500 font-mono">{dailyReport.incidents.todayResolved}</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Avg. Resolution SLA</span>
                          <span className="text-lg font-extrabold text-white font-mono">{dailyReport.incidents.averageResolutionTimeMin} mins</span>
                        </div>
                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
                          <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Automation Success Rate</span>
                          <span className="text-lg font-extrabold text-emerald-400 font-mono">{dailyReport.actions.automationSuccessRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top risk spaces */}
                  <div className="space-y-3 mt-4">
                    <h3 className="text-xs font-bold uppercase text-white tracking-wider border-b border-zinc-900 pb-2">3. Prioritized Areas for Facility Improvements</h3>
                    <div className="divide-y divide-zinc-900">
                      {dailyReport.recommendations.map((rec, idx) => (
                        <div key={idx} className="py-3 flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold text-white block">{rec.action}</span>
                            <span className="text-[10px] text-zinc-500">Category: {rec.category} &bull; Priority: {rec.priority}</span>
                          </div>
                          <span className="text-emerald-500 font-bold font-mono">Est. Save: {rec.estimatedSaving}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-zinc-900 rounded-xl text-zinc-500 text-xs">Generating Operational PDF Report...</div>
              )}
            </div>
          )}

          {/* ==================== VIEW: AI MEMORY ==================== */}
          {activeView === "memory" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">AI Memory & Pattern Recognition</h2>
                <p className="text-zinc-500 text-xs mt-1">Long-term spatial intelligence, utilization hotspots, and temporal analysis models.</p>
              </div>

              {memoryPatterns ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Utilization Hotspots (7 cols) */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Peak Space Utilization Rates</h3>
                      <div className="space-y-4">
                        {memoryPatterns.mostActiveRooms.map(room => (
                          <div key={room.roomId} className="flex flex-col gap-1.5 text-xs">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-white">{room.roomName} ({room.facility})</span>
                              <span className="text-zinc-400 font-mono">{room.utilizationRate}% Capacity</span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-500 h-2" style={{ width: `${room.utilizationRate}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Energy Waste Anomaly Hotspots</h3>
                      <div className="space-y-4">
                        {memoryPatterns.energyWasteHotspots.length === 0 ? (
                          <span className="text-xs text-zinc-500">No rooms flagging repeated energy waste.</span>
                        ) : (
                          memoryPatterns.energyWasteHotspots.map(room => (
                            <div key={room.roomId} className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-900 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-white block">{room.roomName}</span>
                                <span className="text-[10px] text-zinc-500">Waste Duration: {room.emptyDuration}</span>
                              </div>
                              <span className="text-rose-400 font-bold">ANOMALOUS ACTUATOR ON</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Temporal Incidents & Insights (5 cols) */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Temporal Risk Analysis</h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Peak Risk Period:</span>
                          <span className="text-white font-bold font-mono">{memoryPatterns.peakRiskHour}:00 - {memoryPatterns.peakRiskHour + 1}:00 hrs</span>
                        </div>
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Hourly Risk Event Distribution</span>
                          {memoryPatterns.peakRiskPeriods.map(p => (
                            <div key={p.hour} className="flex justify-between items-center text-[11px]">
                              <span className="text-zinc-400 font-mono">{p.hour}</span>
                              <span className="text-white font-mono">{p.count} events</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                      <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Long-Term Operational Insights</h3>
                      <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-2">
                        {memoryPatterns.longTermInsights.map((insight, idx) => (
                          <li key={idx} className="leading-relaxed"><strong className="text-white">{insight}</strong></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-zinc-900 rounded-xl text-zinc-500 text-xs">Synthesizing Temporal Memories...</div>
              )}
            </div>
          )}

          {/* ==================== VIEW: SETTINGS ==================== */}
          {activeView === "settings" && (
            <div className="flex flex-col gap-8 font-sans">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white font-sans">Physical AI System Configuration</h2>
                <p className="text-zinc-500 text-xs mt-1">Configure CCTV cameras, manage active SOP templates, establish alert routing rules, and view device telemetry.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Forms and registers (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* CCTV Onboarding */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">CCTV Camera Auto-Onboarding</h3>
                    <form onSubmit={handleAddCamera} className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Camera Name / Label</label>
                        <input
                          type="text"
                          value={newCameraName}
                          onChange={(e) => setNewCameraName(e.target.value)}
                          placeholder="e.g. Corridor North 3 CAM"
                          className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-700"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold">RTSP Video Source Stream URL</label>
                        <input
                          type="text"
                          value={newCameraRtsp}
                          onChange={(e) => setNewCameraRtsp(e.target.value)}
                          placeholder="e.g. rtsp://admin:secret@192.168.1.50:554/h264"
                          className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-700 font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Onboard to Space</label>
                        <select
                          value={newCameraSpaceId}
                          onChange={(e) => setNewCameraSpaceId(e.target.value)}
                          className="bg-zinc-950 border border-zinc-900 text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-700"
                        >
                          <option value="">Select Target Space...</option>
                          {rooms.map(r => (
                            <option key={r.roomId} value={r.roomId}>{r.roomName} ({r.facility})</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-white text-black font-extrabold text-[10px] rounded-lg hover:bg-zinc-200 transition-all uppercase"
                      >
                        Register CCTV Camera
                      </button>
                    </form>
                  </div>

                  {/* SOP Templates Manager */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">SOP Template Standard Definitions</h3>
                    <div className="flex flex-col gap-4">
                      {sopTemplates.length === 0 ? (
                        <span className="text-xs text-zinc-500">Loading SOP workflow patterns...</span>
                      ) : (
                        sopTemplates.map(t => (
                          <div key={t.key} className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white">{t.name}</span>
                              <span className="text-[10px] text-zinc-500">{t.stepCount} sequential steps</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">{t.description}</p>
                            <div className="space-y-1 mt-2">
                              {t.steps.map(s => (
                                <div key={s.step} className="flex gap-2 text-[10px]">
                                  <span className="text-emerald-400 font-bold font-mono">Step {s.step}:</span>
                                  <span className="text-zinc-350">{s.description} ({s.action})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Device telemetry & role manager (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Alert Routing Rules */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">Automatic Alert Dispatch Rules</h3>
                    <div className="space-y-4 text-xs text-zinc-400">
                      <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg">
                        <strong className="text-white block">Critical Security Incidents</strong>
                        <span>Assigned Role: <strong>Security</strong> &bull; Auto-triggers SOP sequence</span>
                      </div>
                      <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg">
                        <strong className="text-white block">Energy Waste Hazards</strong>
                        <span>Assigned Role: <strong>Facility</strong> &bull; Auto-toggles device switches</span>
                      </div>
                      <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg">
                        <strong className="text-white block">Safety Obstructions & Clearances</strong>
                        <span>Assigned Role: <strong>Safety</strong> &bull; Auto-routes to floor warden</span>
                      </div>
                    </div>
                  </div>

                  {/* Device Telemetry Monitor */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl p-6">
                    <h3 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider mb-4">IoT Telemetry Feeds</h3>
                    <div className="space-y-3">
                      {rooms.map(room => (
                        <div key={room.roomId} className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg flex flex-col gap-3">
                          <div className="flex justify-between items-center text-xs font-bold text-white">
                            <span>{room.roomName} Devices</span>
                            <button
                              onClick={() => handleSendMockTelemetry(room.roomId)}
                              className="text-[9px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2 py-0.5 rounded transition-all"
                            >
                              Push Telemetry
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                            <div className="bg-black/30 p-2 rounded">
                              <span className="block text-zinc-500">Lights Actuator</span>
                              <strong className={room.deviceStates.lights ? "text-emerald-400" : "text-zinc-500"}>
                                {room.deviceStates.lights ? "ACTIVE" : "STANDBY"}
                              </strong>
                            </div>
                            <div className="bg-black/30 p-2 rounded">
                              <span className="block text-zinc-500">HVAC/Fan Actuator</span>
                              <strong className={room.deviceStates.fan ? "text-emerald-400" : "text-zinc-500"}>
                                {room.deviceStates.fan ? "ACTIVE" : "STANDBY"}
                              </strong>
                            </div>
                            <div className="bg-black/30 p-2 rounded">
                              <span className="block text-zinc-500">Lock Relay</span>
                              <strong className={room.deviceStates.doorLocked ? "text-red-400" : "text-emerald-400"}>
                                {room.deviceStates.doorLocked ? "LOCKED" : "UNLOCKED"}
                              </strong>
                            </div>
                            <div className="bg-black/30 p-2 rounded">
                              <span className="block text-zinc-500">Alarm Siren</span>
                              <strong className={room.deviceStates.alarm ? "text-red-500 animate-pulse font-bold" : "text-zinc-500"}>
                                {room.deviceStates.alarm ? "ACTIVE" : "SILENT"}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}




          {/* ==================== VIEW 7: AI COPILOT ==================== */}
          {activeView === "copilot" && (
            <div className="flex flex-col max-w-4xl mx-auto w-full h-[calc(100vh-140px)] md:h-[650px] justify-between font-sans gap-6">
              
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
                      "Generate operational summary.",
                      "What is the campus health score?",
                      "Which rooms are wasting energy?",
                      "Show unresolved incidents.",
                      "Predict tomorrow's risk.",
                      "Show compliance status.",
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
