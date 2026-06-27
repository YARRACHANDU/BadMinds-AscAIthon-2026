/**
 * SentinelAI X — Enterprise Operations AI Copilot Service
 * Responsibility: Performs live queries against active database states for natural language prompts.
 */

const { Space, User } = require("../models/schemas");
const ESM = require("./environmentState.service");
const incidentService = require("./incident.service");
const actionEngine = require("./actionEngine.service");

/**
 * Handle Copilot chat completions
 * @param {string} prompt - User query
 */
const generateCopilotResponse = async (prompt) => {
  const query = prompt.toLowerCase();
  const roomsList = await ESM.getAllRooms();
  const incidentsList = await incidentService.getIncidents();
  const actionsList = await actionEngine.getActionsHistory();
  const metrics = await ESM.getMetrics();

  const activeIncidents = incidentsList.filter(i => i.status === "active");

  // 1. "Who owns [Room]?"
  if (query.includes("who owns") || query.includes("owner of")) {
    // Extract space name guess
    const cleaned = query.replace("who owns", "").replace("owner of", "").trim();
    const spaceDoc = await Space.findOne({ name: { $regex: new RegExp(cleaned, "i") } })
      .populate("owners.primary owners.secondary owners.escalation owners.emergency");

    if (spaceDoc) {
      const p = spaceDoc.owners.primary ? spaceDoc.owners.primary.name : "Unassigned";
      const s = spaceDoc.owners.secondary ? spaceDoc.owners.secondary.name : "Unassigned";
      const esc = spaceDoc.owners.escalation ? spaceDoc.owners.escalation.name : "Unassigned";
      const em = spaceDoc.owners.emergency ? spaceDoc.owners.emergency.name : "Unassigned";
      
      return `Ownership Directory for "${spaceDoc.name}": 
      - Primary Owner: ${p}
      - Secondary Owner: ${s}
      - Escalation Owner: ${esc}
      - Emergency Contact: ${em}`;
    }
    return `I could not locate a registered space matching "${cleaned}" in the organization hierarchy.`;
  }

  // 2. "Which room is wasting the most energy?"
  if (query.includes("wasting the most") || query.includes("most energy") || query.includes("highest wastage")) {
    const wastageRooms = roomsList.filter(r => r.agents.energy.decision === "ENERGY_WASTAGE_DETECTED");
    if (wastageRooms.length === 0) {
      return "Excellent news: Currently, no rooms are identified as wasting energy. All grids are fully optimized.";
    }
    
    const details = wastageRooms.map(r => `${r.roomName} (${r.facility}) - wasting approx. ${r.agents.energy.savingsEstimate}`).join(", ");
    return `Currently, the following room(s) are wasting the most energy: ${details}. I recommend triggering automated utility shutdowns.`;
  }

  // 3. "Show critical incidents from today."
  if (query.includes("critical incidents") || query.includes("critical event") || query.includes("critical today")) {
    const criticalIncidents = incidentsList.filter(i => i.severity === "CRITICAL");
    if (criticalIncidents.length === 0) {
      return "Diagnostics search completed: Zero CRITICAL incidents have been logged today.";
    }
    const list = criticalIncidents.map(i => `[${i.status.toUpperCase()}] ${i.title} in ${i.roomId} - ${i.description}`).join("; ");
    return `Today's CRITICAL events: ${list}. High-priority resolution workflows are currently active.`;
  }

  // 4. "What actions were taken automatically?"
  if (query.includes("actions were taken") || query.includes("taken automatically") || query.includes("actions executed")) {
    const autoActions = actionsList.filter(a => a.details.toLowerCase().includes("auto") || a.details.toLowerCase().includes("eco") || a.details.toLowerCase().includes("protocol"));
    if (autoActions.length === 0) {
      return "Zero automated actions have been dispatched in the last cycle. Waiting for agent recommendations.";
    }
    const recent = autoActions.slice(0, 3).map(a => `${a.type} in ${a.roomId} (${a.status}) - ${a.details}`).join(" | ");
    return `The Action Engine automatically executed: ${recent}. Total successful automated actuations: ${autoActions.length}.`;
  }

  // 5. "Which building has the highest risk score?"
  if (query.includes("highest risk") || query.includes("risk score") || query.includes("highest danger")) {
    const blocksRisk = {};
    roomsList.forEach(r => {
      let score = 0;
      if (r.riskLevel === "CRITICAL") score = 100;
      else if (r.riskLevel === "HIGH") score = 75;
      else if (r.riskLevel === "MEDIUM") score = 40;
      
      blocksRisk[r.facility] = Math.max(blocksRisk[r.facility] || 0, score);
    });

    let highestBlock = "All blocks healthy";
    let highestScore = 0;
    Object.entries(blocksRisk).forEach(([block, score]) => {
      if (score > highestScore) {
        highestScore = score;
        highestBlock = block;
      }
    });

    if (highestScore === 0) {
      return "All blocks are healthy (Risk: LOW). No high risk zones detected.";
    }
    return `The building with the highest risk profile is the "${highestBlock}" (Risk Score: ${highestScore}/100) due to active agent alerts.`;
  }

  // 7. "Which devices are currently idle?"
  if (query.includes("devices are currently idle") || query.includes("idle devices") || query.includes("which devices are idle")) {
    const idleDetails = [];
    roomsList.forEach(r => {
      if (r.occupancyStatus === "Empty") {
        if (r.deviceStates.lights) idleDetails.push(`"${r.roomName} Main Light" (ON in empty room)`);
        if (r.deviceStates.fan) idleDetails.push(`"${r.roomName} Ventilation Fan" (ON in empty room)`);
      }
    });

    if (idleDetails.length === 0) {
      return "All devices are currently active under occupied loads or turned off. Zero idle device waste detected.";
    }
    return `The following devices are currently online in unoccupied spaces and are considered IDLE:\n` + 
      idleDetails.map(d => `- ${d}`).join("\n") + 
      `\nTotal Estimated Waste Rate: ₹${idleDetails.length * 18}/hour. I recommend scheduling immediate shutdowns.`;
  }

  // 8. "Which spaces are overcrowded?"
  if (query.includes("overcrowded") || query.includes("crowded spaces") || query.includes("which spaces are overcrowded")) {
    const crowded = roomsList.filter(r => r.peopleCount > 8);
    if (crowded.length === 0) {
      return "All monitored spaces are operating within nominal occupancy thresholds. No overcrowding detected.";
    }
    return `Currently, the following space is overcrowded:\n` + 
      crowded.map(r => `- ${r.roomName}: ${r.peopleCount} occupants (Limit: 8)`).join("\n") + 
      `\nSafety agent alerts have been dispatched.`;
  }

  // 9. "Which incidents remain unresolved?"
  if (query.includes("unresolved") || query.includes("active incidents") || query.includes("incidents remain unresolved")) {
    if (activeIncidents.length === 0) {
      return "All physical incidents have been resolved. Space operations are nominal.";
    }
    return `There are currently ${activeIncidents.length} unresolved incident(s):\n` +
      activeIncidents.map(i => `- [${i.severity}] ${i.title}: ${i.description}`).join("\n");
  }

  // 10. "Which actions generated the highest savings?"
  if (query.includes("highest savings") || query.includes("most savings") || query.includes("best action savings")) {
    const savingActions = actionsList.filter(a => a.status === "completed" && a.type.startsWith("TURN_OFF"));
    if (savingActions.length === 0) {
      return "No utility shutdown actions have been recorded yet. Cumulative savings are ₹0.";
    }
    return `The automated action generating the highest savings is utility load shedding (TURN_OFF_LIGHTS/TURN_OFF_FAN) in empty classrooms, saving approximately ₹14 to ₹22 per shutdown block. Total savings accumulated today: ₹${metrics.energySavedTodayINR}.`;
  }

  // General fallback queries
  if (query.includes("threat") || query.includes("security") || query.includes("intruder") || query.includes("unauthorized")) {
    const securityIssues = activeIncidents.filter(i => i.title.includes("Entry") || i.title.includes("Breach") || i.title.includes("Intrusion"));
    if (securityIssues.length > 0) {
      return `ALERT: I have detected ${securityIssues.length} active security anomaly(s). Specifically, there is an unresolved "${securityIssues[0].title}" in ${securityIssues[0].roomId}. Lock down sequence in progress.`;
    }
    return "All perimeters are secure. AI agents report 0 threats active across all 5 monitored blocks.";
  }

  if (query.includes("safety") || query.includes("hazard") || query.includes("crowd") || query.includes("obstacle")) {
    const safetyIssues = activeIncidents.filter(i => i.title.includes("Safety") || i.title.includes("Obstruction") || i.title.includes("Crowd"));
    if (safetyIssues.length > 0) {
      return `WARNING: Safety Agent reports a "${safetyIssues[0].title}" in ${safetyIssues[0].roomId} (${safetyIssues[0].description}). Action Required.`;
    }
    return "Safety index is at 100/100. Emergency egress routes are clear and crowd densities are nominal.";
  }

  return `I am monitoring the campus blocks. Occupancy Rate is at ${metrics.occupancyRate}%, Security Score: ${metrics.securityScore}/100, Safety Score: ${metrics.safetyScore}/100. Please query me about energy wastage, active incidents, automated actions, or specific building risk ratings.`;
};

module.exports = {
  generateCopilotResponse
};
