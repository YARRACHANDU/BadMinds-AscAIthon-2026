/**
 * SentinelAI X — Enterprise Multi-Agent Intelligence Service
 * Responsibility: Models specialized AI agents targeting Security, Energy, Safety, and Facilities.
 */

/**
 * Run multi-agent reasoning on a room's state.
 * @param {Object} room - The current room state from the Environment State Manager.
 * @returns {Object} Target outputs for all four agents.
 */
const runAgentReasoning = (room) => {
  const { roomId, roomName, peopleCount, detectedObjects, deviceStates } = room;
  const isServerRoom = roomId.includes("RES") || roomName?.toLowerCase().includes("server") || roomName?.toLowerCase().includes("lab");

  // 1. SECURITY AGENT
  let security = {
    observation: "All perimeters clear.",
    reasoning: "Visual scans show zero unauthorized entries or threat profiles in the vicinity.",
    confidence: 0.96,
    decision: "SECURE",
    recommendedAction: "CONTINUE_MONITORING"
  };

  if (peopleCount > 0 && isServerRoom && !deviceStates.lights) {
    security = {
      observation: "Unlit human activity in secure server/lab cluster.",
      reasoning: "Motion signature detected in dark high-security zone. Unlocks unauthorized entrance hazard profiling.",
      confidence: 0.98,
      decision: "UNAUTHORIZED_ACCESS_RISK",
      recommendedAction: "LOCK_DOOR"
    };
  } else if (detectedObjects.includes("unidentified object") || detectedObjects.includes("intruder")) {
    security = {
      observation: "Unverified entity detected within zone boundary.",
      reasoning: "Target matches anomaly profiles. Ingress/egress mapping indicates unregistered entity entrance.",
      confidence: 0.91,
      decision: "INTRUSION_ALERT",
      recommendedAction: "ACTIVATE_ALARM"
    };
  } else if (peopleCount > 0 && deviceStates.alarm) {
    security = {
      observation: "Human presence detected with security system ARMED.",
      reasoning: "Secure boundary intrusion event triggered by thermal and vision sensor overlap.",
      confidence: 0.99,
      decision: "INTRUSION_ALERT",
      recommendedAction: "ACTIVATE_ALARM"
    };
  }

  // 2. ENERGY AGENT
  let energy = {
    observation: "Smart grid active and optimal.",
    reasoning: "Active power grids align with verified occupant counts.",
    savingsEstimate: "₹0.00/hr",
    decision: "OPTIMIZED",
    recommendedAction: "NONE"
  };

  const lightsOn = deviceStates?.lights ?? true;
  const fanOn = deviceStates?.fan ?? true;

  if (peopleCount === 0 && (lightsOn || fanOn)) {
    const devices = [];
    let savedVal = 0;
    if (lightsOn) {
      devices.push("lighting");
      savedVal += 220; // estimate ₹220/hr
    }
    if (fanOn) {
      devices.push("HVAC grids");
      savedVal += 380; // estimate ₹380/hr
    }

    energy = {
      observation: `Active ${devices.join(" and ")} in empty zone.`,
      reasoning: "Space is completely unoccupied but utilities remain powered. Violates corporate carbon-neutral protocol.",
      savingsEstimate: `₹${savedVal}.00/hr`,
      decision: "ENERGY_WASTAGE_DETECTED",
      recommendedAction: lightsOn ? "TURN_OFF_LIGHTS" : "TURN_OFF_FAN"
    };
  } else if (peopleCount > 0 && !lightsOn) {
    energy = {
      observation: "Occupied workspace without lighting.",
      reasoning: "Human presence detected. Lighting grid should activate to ensure OSHA compliance.",
      savingsEstimate: "₹0.00/hr",
      decision: "INSUFFICIENT_LIGHTING",
      recommendedAction: "TURN_ON_LIGHTS"
    };
  }

  // 3. SAFETY AGENT
  let safety = {
    observation: "Safety checks nominal.",
    riskLevel: "LOW",
    reasoning: "All exit paths remain unobstructed, and occupant count is within safety limits.",
    decision: "COMPLIANT",
    action: "CONTINUE_MONITORING"
  };

  const hasObstacle = detectedObjects.some(obj => 
    ["obstacle", "unidentified object", "pallet", "box", "debris", "obstruction"].includes(obj.toLowerCase())
  );

  if (peopleCount > 8) {
    safety = {
      observation: `High-density crowding detected (${peopleCount} people).`,
      riskLevel: "MEDIUM",
      reasoning: "Local occupancy limit breached. Increases emergency evacuation risk profile.",
      decision: "CROWD_LIMIT_EXCEEDED",
      action: "SEND_NOTIFICATION"
    };
  } else if (hasObstacle) {
    safety = {
      observation: "Emergency egress path is physically obstructed.",
      riskLevel: "HIGH",
      reasoning: "Visual obstacle identified blocking critical hallway zone or exit doorway.",
      decision: "SAFETY_HAZARD_DETECTED",
      action: "CREATE_INCIDENT"
    };
  }

  // 4. FACILITY AGENT
  let facility = {
    observation: "Structural integrity nominal.",
    facilityHealthScore: 98,
    recommendation: "Routine inspection cycle in 48h.",
    priority: "LOW"
  };

  if (peopleCount > 0 && deviceStates.lights && deviceStates.fan) {
    const rate = Math.round((peopleCount / 10) * 100);
    facility = {
      observation: `Active infrastructure utilization at ${rate}%.`,
      facilityHealthScore: 92,
      recommendation: "Optimize ventilation flow parameters.",
      priority: "MEDIUM"
    };
  } else if (peopleCount === 0 && (deviceStates.lights || deviceStates.fan)) {
    facility = {
      observation: "Space utility operational in empty room.",
      facilityHealthScore: 84,
      recommendation: "Activate eco standby schedule.",
      priority: "HIGH"
    };
  }

  return {
    security,
    energy,
    safety,
    facility
  };
};

module.exports = {
  runAgentReasoning
};
