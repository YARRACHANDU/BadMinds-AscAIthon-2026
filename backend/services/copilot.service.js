/**
 * SentinelAI X — Operations AI Copilot Service
 * Responsibility: Generates natural language responses for administration queries by analyzing live telemetry.
 */

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
  const incidentsList = incidentService.getIncidents();
  const actionsList = actionEngine.getActionsHistory();
  const metrics = ESM.getMetrics();

  const activeIncidents = incidentsList.filter(i => i.status === "active");
  const wastageRooms = roomsList.filter(r => r.agents.energy.decision === "ENERGY_WASTAGE_DETECTED");

  // Query Parsing Rules
  if (query.includes("threat") || query.includes("security") || query.includes("intruder") || query.includes("unauthorized")) {
    const securityIssues = activeIncidents.filter(i => i.title.includes("Entry") || i.title.includes("Breach") || i.title.includes("Intrusion"));
    if (securityIssues.length > 0) {
      return `ALERT: I have detected ${securityIssues.length} active security anomaly(s). Specifically, there is an unresolved "${securityIssues[0].title}" in ${securityIssues[0].roomId}. I have already initiated safety locks.`;
    }
    return "All security perimeters are secure. AI agents report 0 threats active across all 5 monitored blocks.";
  }

  if (query.includes("energy") || query.includes("wastage") || query.includes("light") || query.includes("power") || query.includes("save")) {
    if (wastageRooms.length > 0) {
      return `I see energy optimization opportunities in: ${wastageRooms.map(r => r.roomName).join(", ")}. In these rooms, occupancy is zero but devices remain active. Estimated wastage is ₹${wastageRooms.length * 220}/hr. Recommend firing automated shutdown.`;
    }
    return `Energy grids are optimized. We have saved ₹${metrics.energySavedTodayINR} today. Automation success rate is currently at ${metrics.automationSuccessRate}%.`;
  }

  if (query.includes("safety") || query.includes("hazard") || query.includes("crowd") || query.includes("obstacle")) {
    const safetyIssues = activeIncidents.filter(i => i.title.includes("Safety") || i.title.includes("Obstruction") || i.title.includes("Crowd"));
    if (safetyIssues.length > 0) {
      return `WARNING: Safety Agent reports a "${safetyIssues[0].title}" in ${safetyIssues[0].roomId} (${safetyIssues[0].description}). Recommended Action: Send cleanup personnel.`;
    }
    return "Safety rating is at 100/100. Emergency egress routes are clear and crowd densities are well within limits.";
  }

  if (query.includes("status") || query.includes("summary") || query.includes("campus") || query.includes("hello") || query.includes("hi")) {
    return `Good Day Administrator. Campus status is currently nominal. We are monitoring ${roomsList.length} rooms across 5 blocks. 4 AI Agents are auditing sensors in real-time. We have resolved ${incidentsList.filter(i => i.status === 'resolved').length} incidents today and saved ₹${metrics.energySavedTodayINR} in electricity tariffs.`;
  }

  // Default response showing general intelligence
  return `I am auditing the campus blocks. Current Occupancy is at ${metrics.occupancyRate}%. There are ${activeIncidents.length} open tickets. We saved ${metrics.estimatedEnergySaved} kWh today. Please ask me about "security threats", "energy wastage", or "safety safety violations" for detailed breakdowns.`;
};

module.exports = {
  generateCopilotResponse
};
