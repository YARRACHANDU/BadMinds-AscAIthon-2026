/**
 * SentinelAI 2.0 — Environment State Manager Service
 * Responsibility: Tracks multiple rooms, executes agent reasoning loops,
 * and maintains metrics/device configurations.
 */

const aiAgent = require("./aiAgent.service");
const incidentService = require("./incident.service");
const actionEngine = require("./actionEngine.service");
const eventTimeline = require("./eventTimeline.service");

// In-memory store
const rooms = new Map();

// Helper to determine risk level
const calcRiskLevel = (agents) => {
  if (agents.security.decision === "INTRUSION_ALERT" || agents.security.decision === "UNAUTHORIZED_ACCESS_RISK") {
    return "CRITICAL";
  }
  if (agents.safety.decision === "SAFETY_HAZARD_DETECTED") {
    return "HIGH";
  }
  if (agents.energy.decision === "ENERGY_WASTAGE_DETECTED") {
    return "MEDIUM";
  }
  return "LOW";
};

// Initial Room setup templates
const DEFAULT_ROOMS = [
  { id: "ROOM_A", name: "Main Office / Lab", camera: "CAM_A" },
  { id: "ROOM_B", name: "Warehouse / Packing", camera: "CAM_B" },
  { id: "ROOM_C", name: "Executive Suite", camera: "CAM_C" },
  { id: "ROOM_D", name: "Server Room D", camera: "CAM_D" }
];

const createDefaultState = (roomId, roomName, cameraId) => {
  const initialDeviceStates = {
    lights: true,
    fan: true,
    alarm: false
  };

  const tempRoom = {
    roomId,
    roomName: roomName || roomId,
    cameraId: cameraId || roomId,
    peopleCount: 0,
    detectedObjects: [],
    occupancyStatus: "Empty",
    roomEmptySince: new Date().toISOString(),
    lastActivityTime: null,
    lastUpdated: new Date().toISOString(),
    confidence: 0.95,
    frameCount: 0,
    deviceStates: initialDeviceStates,
    riskLevel: "LOW",
    statusSummary: "Optimal"
  };

  // Run initial reasoning pass
  tempRoom.agents = aiAgent.runAgentReasoning(tempRoom);
  return tempRoom;
};

// Initialize the 4 rooms in memory on load
DEFAULT_ROOMS.forEach(r => {
  rooms.set(r.id, createDefaultState(r.id, r.name, r.camera));
});

const getAllRooms = async () => {
  return Array.from(rooms.values());
};

const getRoom = async (roomId) => {
  return rooms.get(roomId) || null;
};

const createRoom = async (roomId, cameraId) => {
  if (rooms.has(roomId)) return rooms.get(roomId);
  const state = createDefaultState(roomId, null, cameraId);
  rooms.set(roomId, state);
  return state;
};

const deleteRoom = async (roomId) => {
  if (!rooms.has(roomId)) return false;
  rooms.delete(roomId);
  return true;
};

const updateDeviceState = async (roomId, deviceStatePatch) => {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.deviceStates = {
    ...room.deviceStates,
    ...deviceStatePatch
  };
  room.lastUpdated = new Date().toISOString();

  // Re-run agents evaluation
  room.agents = aiAgent.runAgentReasoning(room);
  room.riskLevel = calcRiskLevel(room.agents);

  return room;
};

/**
 * Main update routine triggered by vision stream ingestion
 */
const updateEnvironmentState = async (roomId, perceptionData, cameraId) => {
  let room = rooms.get(roomId);
  if (!room) {
    room = await createRoom(roomId, cameraId);
  }

  const objects = perceptionData.objects || perceptionData.data?.objects || [];
  const newPeopleCount = objects.filter(obj => obj.label === "person").length;
  
  // Extract unique labels
  const uniqueLabels = [...new Set(objects.map(obj => obj.label))];
  
  // Update core state
  room.peopleCount = newPeopleCount;
  room.detectedObjects = uniqueLabels;
  room.frameCount += 1;
  room.lastUpdated = new Date().toISOString();

  const wasOccupied = room.occupancyStatus === "Occupied";
  const isNowOccupied = newPeopleCount > 0;
  room.occupancyStatus = isNowOccupied ? "Occupied" : "Empty";

  if (wasOccupied && !isNowOccupied) {
    room.roomEmptySince = new Date().toISOString();
    eventTimeline.addEvent(roomId, "info", "Zone status changed to Unoccupied.");
  } else if (!wasOccupied && isNowOccupied) {
    room.roomEmptySince = null;
    room.lastActivityTime = new Date().toISOString();
    eventTimeline.addEvent(roomId, "info", `Occupancy detected: ${newPeopleCount} personnel.`);
  }

  // Run Multi-Agent reasoning on new visual states
  room.agents = aiAgent.runAgentReasoning(room);
  room.riskLevel = calcRiskLevel(room.agents);

  // Compute average confidence
  const totalConf = Object.values(room.agents).reduce((sum, ag) => sum + ag.confidence, 0);
  room.confidence = parseFloat((totalConf / 4).toFixed(3));

  // Determine Status Summary
  if (room.riskLevel === "CRITICAL" || room.riskLevel === "HIGH") {
    room.statusSummary = "Breach Detected";
  } else if (room.riskLevel === "MEDIUM") {
    room.statusSummary = "Wastage Warning";
  } else {
    room.statusSummary = "Optimal";
  }

  // Action Orchestration & Incident Generation based on Agent recommendations
  await orchestrateDecisions(room);

  return {
    roomId,
    updated: room
  };
};

/**
 * Intercept Agent outputs and fire appropriate alerts or actions.
 */
const orchestrateDecisions = async (room) => {
  const { roomId, agents, roomName } = room;

  // 1. Handle Security anomalies
  if (agents.security.decision === "UNAUTHORIZED_ACCESS_RISK") {
    incidentService.createIncident(
      roomId,
      "Unauthorized Entry",
      `Pre-authorization breach: Personnel detected in restricted ${roomName}.`,
      "HIGH"
    );
    actionEngine.triggerAction(roomId, "SEND_NOTIFICATION", { reason: "Unauthorized entrance flag raised." });
  } else if (agents.security.decision === "INTRUSION_ALERT") {
    incidentService.createIncident(
      roomId,
      "Security Breach: Intrusion",
      `Critical security anomaly. Intrusion detected in armed ${roomName}.`,
      "CRITICAL"
    );
    actionEngine.triggerAction(roomId, "ACTIVATE_ALARM", { reason: "Armed boundary breached." });
  } else {
    incidentService.autoResolveIncident(roomId, "Unauthorized Entry");
    incidentService.autoResolveIncident(roomId, "Security Breach: Intrusion");
  }

  // 2. Handle Energy anomalies
  if (agents.energy.decision === "ENERGY_WASTAGE_DETECTED") {
    incidentService.createIncident(
      roomId,
      "Energy Efficiency Alert",
      `Devices remain active in unoccupied room: ${roomName}.`,
      "MEDIUM"
    );

    // Auto-trigger recommended saving shutdowns
    if (agents.energy.recommendedAction === "TURN_OFF_LIGHTS") {
      actionEngine.triggerAction(roomId, "TURN_OFF_LIGHTS", { reason: "Automated eco-saving protocol." });
    } else if (agents.energy.recommendedAction === "TURN_OFF_FAN") {
      actionEngine.triggerAction(roomId, "TURN_OFF_FAN", { reason: "Automated eco-saving protocol." });
    }
  } else {
    incidentService.autoResolveIncident(roomId, "Energy Efficiency Alert");
  }

  // 3. Handle Safety anomalies
  if (agents.safety.decision === "SAFETY_HAZARD_DETECTED") {
    incidentService.createIncident(
      roomId,
      "Safety Warning: Obstruction",
      `Emergency exit or pathway obstructed in ${roomName}.`,
      "HIGH"
    );
    actionEngine.triggerAction(roomId, "CREATE_INCIDENT", { reason: "Obstacle obstruction alert." });
  } else if (agents.safety.decision === "CROWD_LIMIT_EXCEEDED") {
    incidentService.createIncident(
      roomId,
      "Crowd Limit Warning",
      `Personnel density exceeds safety threshold in ${roomName}.`,
      "MEDIUM"
    );
    actionEngine.triggerAction(roomId, "SEND_NOTIFICATION", { reason: "Density safety limits warning." });
  } else {
    incidentService.autoResolveIncident(roomId, "Safety Warning: Obstruction");
    incidentService.autoResolveIncident(roomId, "Crowd Limit Warning");
  }
};

/**
 * Calculates global operational metrics
 */
const getMetrics = () => {
  const roomsList = Array.from(rooms.values());
  const allIncidents = incidentService.getIncidents();
  const allActions = actionEngine.getActionsHistory();

  const occupiedCount = roomsList.filter(r => r.occupancyStatus === "Occupied").length;
  const occupancyRate = roomsList.length > 0 ? Math.round((occupiedCount / roomsList.length) * 100) : 0;

  // Score Calculations (Deductive starting from 100)
  const activeSecurityIncidents = allIncidents.filter(i => i.status === "active" && (i.title.includes("Entry") || i.title.includes("Intrusion"))).length;
  const securityScore = Math.max(0, 100 - activeSecurityIncidents * 20);

  const activeSafetyIncidents = allIncidents.filter(i => i.status === "active" && (i.title.includes("Safety") || i.title.includes("Crowd"))).length;
  const safetyScore = Math.max(0, 100 - activeSafetyIncidents * 15);

  const energyWasteCount = roomsList.filter(r => r.agents.energy.decision === "ENERGY_WASTAGE_DETECTED").length;
  const energyEfficiencyScore = Math.max(0, 100 - energyWasteCount * 25);

  const totalConf = roomsList.reduce((sum, r) => sum + r.confidence, 0);
  const aiConfidenceAverage = roomsList.length > 0 ? Math.round((totalConf / roomsList.length) * 100) : 95;

  const incidentsToday = allIncidents.length;
  const actionsExecuted = allActions.filter(a => a.status === "completed").length;

  // Dynamic estimate of saved energy: 0.15kWh per turn-off action completed
  const turnOffActions = allActions.filter(a => a.status === "completed" && a.type.startsWith("TURN_OFF")).length;
  const estimatedEnergySaved = parseFloat((turnOffActions * 0.18).toFixed(2));

  return {
    occupancyRate,
    securityScore,
    safetyScore,
    energyEfficiencyScore,
    aiConfidenceAverage,
    incidentsToday,
    actionsExecuted,
    estimatedEnergySaved
  };
};

module.exports = {
  createRoom,
  getRoom,
  getAllRooms,
  deleteRoom,
  updateDeviceState,
  updateEnvironmentState,
  getMetrics
};
