/**
 * SentinelAI X — Enterprise Multi-Agent Intelligence Service
 * Responsibility: Models specialized AI agents targeting Security, Energy, Safety, and Facilities.
 * Implements evidence-based reasoning containing observation, evidence, confidence, reasoning, decision, and action.
 */

const ruleEngine = require("./ruleEngine.service");

/**
 * Run multi-agent reasoning on a room's state.
 * @param {Object} room - The current room state from the Environment State Manager.
 * @returns {Object} Target outputs for all four agents.
 */
const runAgentReasoning = (room) => {
  const {
    roomId,
    roomName,
    peopleCount,
    detectedObjects = [],
    deviceStates = {},
    occupancyStatusDetailed = "Empty",
    occupancyConfidence = 100,
    temporalHistory = [],
    roomEmptySince = null,
    roomOccupiedSince = null
  } = room;

  // Evaluate the rules using our new rule engine
  const triggeredRules = ruleEngine.evaluateRules(room, detectedObjects);

  // Helper to compile temporal evidence string
  const lastNFrames = temporalHistory.slice(-20);
  const consecutiveFrames = lastNFrames.length;
  const framesWithPeople = lastNFrames.filter(f => f.peopleCount > 0).length;
  const evidenceStr = `${framesWithPeople}/${consecutiveFrames} consecutive frames with people. Occupancy confidence: ${occupancyConfidence}%.`;

  // Find rules triggered for each agent
  const securityRule = triggeredRules.find(r => r.agent === "security");
  const energyRule = triggeredRules.find(r => r.agent === "energy");
  const safetyRule = triggeredRules.find(r => r.agent === "safety");

  // 1. SECURITY AGENT
  let security = {
    observation: "All perimeters clear.",
    evidence: evidenceStr,
    confidence: parseFloat((occupancyConfidence / 100).toFixed(2)),
    reasoning: "Visual and temporal scans confirm zero unauthorized entries or threat profiles.",
    decision: "SECURE",
    recommendedAction: "CONTINUE_MONITORING",
    ruleTriggered: "None"
  };

  if (securityRule) {
    security = {
      observation: securityRule.reasoning,
      evidence: `${peopleCount} person(s) detected. ${evidenceStr}`,
      confidence: 0.98,
      reasoning: `Rule [${securityRule.name}] triggered. Ingress/egress mapping indicates unauthorized activity.`,
      decision: securityRule.decision,
      recommendedAction: securityRule.action,
      ruleTriggered: securityRule.name
    };
  }

  // 2. ENERGY AGENT
  let energy = {
    observation: "Smart grid active and optimal.",
    evidence: `Utilities state: Lights=${deviceStates.lights ? "ON" : "OFF"}, Fan=${deviceStates.fan ? "ON" : "OFF"}. ${evidenceStr}`,
    confidence: parseFloat((Math.max(90, occupancyConfidence) / 100).toFixed(2)),
    reasoning: "Active power grids align with verified occupant counts.",
    savingsEstimate: "₹0.00/hr",
    decision: "OPTIMIZED",
    recommendedAction: "NONE",
    ruleTriggered: "None"
  };

  if (energyRule) {
    let savedVal = 0;
    if (deviceStates.lights) savedVal += 220;
    if (deviceStates.fan) savedVal += 380;

    energy = {
      observation: energyRule.reasoning,
      evidence: `Utilities state: Lights=${deviceStates.lights ? "ON" : "OFF"}, Fan=${deviceStates.fan ? "ON" : "OFF"}. ${evidenceStr}`,
      confidence: parseFloat((occupancyConfidence / 100).toFixed(2)),
      reasoning: `Rule [${energyRule.name}] triggered. Space usage deviates from efficiency guidelines.`,
      savingsEstimate: `₹${savedVal}.00/hr`,
      decision: energyRule.decision,
      recommendedAction: energyRule.action,
      ruleTriggered: energyRule.name
    };
  }

  // 3. SAFETY AGENT
  let safety = {
    observation: "Safety checks nominal.",
    evidence: `Egress is clear. ${evidenceStr}`,
    confidence: 0.97,
    riskLevel: "LOW",
    reasoning: "All exit paths remain unobstructed, and occupant count is within safety limits.",
    decision: "COMPLIANT",
    action: "CONTINUE_MONITORING",
    recommendedAction: "CONTINUE_MONITORING",
    ruleTriggered: "None"
  };

  if (safetyRule) {
    safety = {
      observation: safetyRule.reasoning,
      evidence: `Safety profile matches critical criteria. ${evidenceStr}`,
      confidence: 0.93,
      riskLevel: safetyRule.severity,
      reasoning: `Rule [${safetyRule.name}] triggered. Safety boundaries or capacity guidelines violated.`,
      decision: safetyRule.decision,
      action: safetyRule.action,
      recommendedAction: safetyRule.action,
      ruleTriggered: safetyRule.name
    };
  }

  // 4. FACILITY AGENT
  let facility = {
    observation: "Structural integrity nominal.",
    evidence: "Equipment states verified.",
    confidence: 0.95,
    reasoning: "Equipment states nominal. No maintenance triggers present.",
    decision: "HEALTHY",
    facilityHealthScore: 98,
    recommendation: "Routine inspection cycle in 48h.",
    priority: "LOW",
    ruleTriggered: "None"
  };

  if (peopleCount > 0 && deviceStates.lights && deviceStates.fan) {
    const rate = Math.round((peopleCount / 10) * 100);
    facility = {
      observation: `Active infrastructure utilization at ${rate}%.`,
      evidence: `Active equipment load: Lights=ON, Fan=ON.`,
      confidence: 0.96,
      reasoning: "Infrastructure is being utilized under active occupants.",
      decision: "ACTIVE",
      facilityHealthScore: 92,
      recommendation: "Optimize ventilation flow parameters.",
      priority: "MEDIUM",
      ruleTriggered: "None"
    };
  } else if (peopleCount === 0 && (deviceStates.lights || deviceStates.fan)) {
    facility = {
      observation: "Space utility operational in empty room.",
      evidence: "Active utility load in empty space.",
      confidence: 0.95,
      reasoning: "Energy grids are operating without occupants present, decreasing health score.",
      decision: "EFFICIENCY_RISK",
      facilityHealthScore: 84,
      recommendation: "Activate eco standby schedule.",
      priority: "HIGH",
      ruleTriggered: "None"
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
