/**
 * SentinelAI 2.0 — Multi-Agent AI Architecture Service
 * Responsibility: Simulates/executes multi-agent intelligence across Security, Energy, Safety, and Facility domains.
 */

/**
 * Run multi-agent reasoning on a room's state.
 * @param {Object} room - The current room state from the Environment State Manager.
 * @returns {Object} An object containing output from all four agents.
 */
const runAgentReasoning = (room) => {
  const { roomId, roomName, peopleCount, detectedObjects, deviceStates } = room;
  const isServerRoom = roomId === "ROOM_D" || roomName?.toLowerCase().includes("server");
  
  // 1. SECURITY AGENT
  let security = {
    observation: "No security issues detected.",
    reasoning: "No intruders or suspicious objects observed in the zone.",
    confidence: 0.95,
    decision: "SECURE",
    recommendedAction: "NONE"
  };

  if (peopleCount > 0 && isServerRoom) {
    security = {
      observation: `Human presence (${peopleCount}) detected in restricted Server Room.`,
      reasoning: "Access to Server Room D requires pre-authorization. Unverified personnel presence detected in restricted server rack environment.",
      confidence: 0.98,
      decision: "UNAUTHORIZED_ACCESS_RISK",
      recommendedAction: "SEND_NOTIFICATION"
    };
  } else if (detectedObjects.includes("unidentified object") || detectedObjects.includes("intruder")) {
    security = {
      observation: "Suspicious or unidentified entity detected in area.",
      reasoning: "Visual classification shows an object matching signature profile of unregistered equipment or intrusion attempt.",
      confidence: 0.85,
      decision: "SUSPICIOUS_ACTIVITY",
      recommendedAction: "ACTIVATE_ALARM"
    };
  } else if (peopleCount > 0 && deviceStates.alarm) {
    security = {
      observation: "Human presence detected while security system is armed.",
      reasoning: "Physical intrusion detected; active sensors show motion within secured perimeter.",
      confidence: 0.99,
      decision: "INTRUSION_ALERT",
      recommendedAction: "ACTIVATE_ALARM"
    };
  }

  // 2. ENERGY AGENT
  let energy = {
    observation: "Device consumption optimized.",
    reasoning: "Environmental devices are in power-saving states or active during verified occupancy.",
    confidence: 0.97,
    decision: "OPTIMIZED",
    recommendedAction: "NONE"
  };

  const lightsOn = deviceStates?.lights ?? true;
  const fanOn = deviceStates?.fan ?? true;

  if (peopleCount === 0 && (lightsOn || fanOn)) {
    const activeDevices = [];
    if (lightsOn) activeDevices.push("lighting grids");
    if (fanOn) activeDevices.push("ventilation fans");

    energy = {
      observation: `Unoccupied room with active ${activeDevices.join(" and ")}.`,
      reasoning: "Zero occupants detected in room. Physical infrastructure continues drawing power, violating green building policy.",
      confidence: 0.94,
      decision: "ENERGY_WASTAGE_DETECTED",
      recommendedAction: lightsOn && fanOn ? "TURN_OFF_LIGHTS" : (lightsOn ? "TURN_OFF_LIGHTS" : "TURN_OFF_FAN")
    };
  } else if (peopleCount > 0 && !lightsOn) {
    energy = {
      observation: "Occupants present in low light conditions.",
      reasoning: "Occupancy count is greater than zero but lighting grids are powered off. Action required to restore operational standards.",
      confidence: 0.92,
      decision: "INSUFFICIENT_LIGHTING",
      recommendedAction: "TURN_ON_LIGHTS"
    };
  }

  // 3. SAFETY AGENT
  let safety = {
    observation: "Compliance standards met.",
    reasoning: "Area is clear of obstacles, emergency paths are open, and crowd densities are within limits.",
    confidence: 0.96,
    decision: "COMPLIANT",
    recommendedAction: "NONE"
  };

  const hasObstacle = detectedObjects.some(obj => 
    ["obstacle", "unidentified object", "pallet", "box", "debris"].includes(obj.toLowerCase())
  );

  if (peopleCount > 6) {
    safety = {
      observation: `High crowd density (${peopleCount} occupants) detected.`,
      reasoning: "Occupant density exceeds safety thresholds for safe egress in this zone category.",
      confidence: 0.91,
      decision: "CROWD_LIMIT_EXCEEDED",
      recommendedAction: "SEND_NOTIFICATION"
    };
  } else if (hasObstacle) {
    safety = {
      observation: "Physical obstacle blocking path of egress.",
      reasoning: "Computer vision path segment analysis shows clutter blocking fire exits or main pathways.",
      confidence: 0.89,
      decision: "SAFETY_HAZARD_DETECTED",
      recommendedAction: "CREATE_INCIDENT"
    };
  }

  // 4. FACILITY AGENT
  let facility = {
    observation: "Operations nominal.",
    reasoning: "Room parameters are within operating thresholds. Device and sensor health are stable.",
    confidence: 0.90,
    decision: "NOMINAL",
    recommendedAction: "NONE"
  };

  const utilizationRate = peopleCount > 0 ? (peopleCount / 8) * 100 : 0;
  if (utilizationRate > 80) {
    facility = {
      observation: "High infrastructure resource utilization.",
      reasoning: "Current space occupancy is approaching peak design limits. Heavy HVAC and utility usage expected.",
      confidence: 0.88,
      decision: "HIGH_UTILIZATION",
      recommendedAction: "GENERATE_REPORT"
    };
  } else if (peopleCount === 0 && deviceStates.lights && deviceStates.fan) {
    facility = {
      observation: "Maintenance observation: Idle operations.",
      reasoning: "Space is fully active with zero utilization. Flagging for automated cooling/heating reset cycle.",
      confidence: 0.85,
      decision: "MAINTENANCE_RECOMMENDED",
      recommendedAction: "TURN_OFF_FAN"
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
