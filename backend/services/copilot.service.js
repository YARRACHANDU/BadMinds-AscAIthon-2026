/**
 * SentinelAI X — Enterprise Operations AI Copilot Service
 * Responsibility: Performs live queries against active database states for natural language prompts.
 * Extended with: campus health queries, predictions, compliance summaries, and operational summaries.
 */

const { Space, User } = require("../models/schemas");
const ESM = require("./environmentState.service");
const incidentService = require("./incident.service");
const actionEngine = require("./actionEngine.service");
const healthScoreService = require("./healthScore.service");
const predictiveService = require("./predictive.service");
const complianceService = require("./compliance.service");

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
    const cleaned = query.replace("who owns", "").replace("owner of", "").trim();
    const spaceDoc = await Space.findOne({ name: { $regex: new RegExp(cleaned, "i") } })
      .populate("owners.primary owners.secondary owners.escalation owners.emergency");
    if (spaceDoc) {
      const p = spaceDoc.owners?.primary?.name || "Unassigned";
      const s = spaceDoc.owners?.secondary?.name || "Unassigned";
      const esc = spaceDoc.owners?.escalation?.name || "Unassigned";
      const em = spaceDoc.owners?.emergency?.name || "Unassigned";
      return `Ownership Directory for "${spaceDoc.name}": Primary: ${p} | Secondary: ${s} | Escalation: ${esc} | Emergency: ${em}`;
    }
    return `I could not locate a registered space matching "${cleaned}" in the organization hierarchy.`;
  }

  // 2. Energy wastage queries
  if (query.includes("wasting") || query.includes("most energy") || query.includes("highest wastage") || query.includes("energy waste")) {
    const wastageRooms = roomsList.filter(r => r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED");
    if (wastageRooms.length === 0) {
      return "Excellent news: Currently, no rooms are identified as wasting energy. All grids are fully optimized.";
    }
    const details = wastageRooms.map(r => `${r.roomName} (${r.facility}) — Est. waste: ${r.agents.energy.savingsEstimate}`).join(" | ");
    return `Currently ${wastageRooms.length} room(s) are wasting energy: ${details}. I recommend triggering automated utility shutdowns immediately.`;
  }

  // 3. Which buildings waste the most energy?
  if (query.includes("which building") && (query.includes("energy") || query.includes("waste"))) {
    const buildingWaste = {};
    roomsList.filter(r => r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED").forEach(r => {
      buildingWaste[r.facility] = (buildingWaste[r.facility] || 0) + 1;
    });
    if (Object.keys(buildingWaste).length === 0) {
      return "No buildings are currently exhibiting energy waste patterns. All facilities are optimized.";
    }
    const sorted = Object.entries(buildingWaste).sort((a, b) => b[1] - a[1]);
    return `Energy waste ranking by building: ${sorted.map(([b, c]) => `${b} (${c} room${c > 1 ? "s" : ""})`).join(" → ")}. Recommend prioritizing ${sorted[0][0]} for automated intervention.`;
  }

  // 4. Campus health score
  if (query.includes("health score") || query.includes("campus health") || query.includes("building health")) {
    const healthData = healthScoreService.computeHealthScores(roomsList, incidentsList);
    const topIssue = healthData.buildings[0]; // worst first
    return `Campus Health Score: ${healthData.campus.score}/100 (Grade ${healthData.campus.grade}) — Status: ${healthData.campus.status}. ` +
      `${healthData.campus.healthyRooms} healthy rooms, ${healthData.campus.warningRooms} at warning, ${healthData.campus.criticalRooms} critical. ` +
      (topIssue ? `Lowest performing facility: "${topIssue.name}" at ${topIssue.score}/100.` : "");
  }

  // 5. Compliance status
  if (query.includes("compliance") || query.includes("audit") || query.includes("compliant")) {
    const complianceReport = complianceService.runComplianceAudit(roomsList);
    return `Compliance Audit Results: Overall Score ${complianceReport.overallComplianceScore}% — Status: ${complianceReport.status}. ` +
      `${complianceReport.summary.compliantRooms} rooms fully compliant, ${complianceReport.summary.nonCompliantRooms} non-compliant out of ${complianceReport.summary.totalRoomsAudited} monitored spaces. ` +
      (complianceReport.summary.totalFailed > 0 ? `${complianceReport.summary.totalFailed} compliance violations require immediate attention.` : "");
  }

  // 6. Predictions
  if (query.includes("predict") || query.includes("will happen") || query.includes("forecast") || query.includes("risk tomorrow")) {
    const predictions = predictiveService.generatePredictions(roomsList, incidentsList);
    if (predictions.length === 0) {
      return "Predictive models show stable conditions across all monitored spaces. No anomalies forecast in the next 30 minutes.";
    }
    const top = predictions.slice(0, 3).map((p, i) => `${i + 1}. [${p.category.toUpperCase()}] ${p.prediction} (Confidence: ${p.confidence}%)`).join(" | ");
    return `Top ${Math.min(3, predictions.length)} Predictions: ${top}`;
  }

  // 7. Show security events today
  if (query.includes("security events") || (query.includes("security") && query.includes("today"))) {
    const securityIncidents = incidentsList.filter(i =>
      i.title?.toLowerCase().includes("unauthorized") || i.title?.toLowerCase().includes("breach") || i.title?.toLowerCase().includes("intrusion")
    );
    if (securityIncidents.length === 0) {
      return "No security events logged today. All perimeters are secure.";
    }
    return `Security events (${securityIncidents.length} total): ${securityIncidents.slice(0,3).map(i => `[${i.status.toUpperCase()}] ${i.title} in ${i.roomId}`).join(" | ")}`;
  }

  // 8. Generate operational summary
  if (query.includes("operational summary") || query.includes("system status") || query.includes("what is happening")) {
    const healthData = healthScoreService.computeHealthScores(roomsList, incidentsList);
    const occupiedCount = roomsList.filter(r => r.occupancyStatus === "Occupied").length;
    const wasteCount = roomsList.filter(r => r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED").length;
    return `Operational Summary — ${new Date().toLocaleTimeString("en-IN")}: ` +
      `Campus Health ${healthData.campus.score}/100 (${healthData.campus.status}). ` +
      `${occupiedCount}/${roomsList.length} spaces occupied. ` +
      `${activeIncidents.length} active incident(s). ` +
      `${wasteCount} energy waste room(s). ` +
      `Security Score: ${metrics.securityScore}/100. ` +
      `Energy saved today: ₹${metrics.energySavedTodayINR}. ` +
      `Automation success rate: ${metrics.automationSuccessRate}%.`;
  }

  // 9. Critical incidents
  if (query.includes("critical incidents") || query.includes("critical event") || query.includes("critical today")) {
    const criticalIncidents = incidentsList.filter(i => i.severity === "CRITICAL");
    if (criticalIncidents.length === 0) return "Zero CRITICAL incidents have been logged.";
    return `CRITICAL events: ${criticalIncidents.map(i => `[${i.status.toUpperCase()}] ${i.title} in ${i.roomId}`).join("; ")}`;
  }

  // 10. Unresolved incidents
  if (query.includes("unresolved") || query.includes("active incidents") || query.includes("incidents remain")) {
    if (activeIncidents.length === 0) return "All physical incidents have been resolved. Space operations are nominal.";
    return `${activeIncidents.length} unresolved incident(s): ${activeIncidents.map(i => `[${i.severity}] ${i.title}`).join(" | ")}`;
  }

  // 11. Idle devices
  if (query.includes("idle devices") || query.includes("devices idle") || query.includes("which devices")) {
    const idleDetails = [];
    roomsList.forEach(r => {
      if (r.occupancyStatus === "Empty") {
        if (r.deviceStates?.lights) idleDetails.push(`"${r.roomName} Light" (ON in empty room)`);
        if (r.deviceStates?.fan) idleDetails.push(`"${r.roomName} Fan" (ON in empty room)`);
      }
    });
    if (idleDetails.length === 0) return "All devices are correctly matched to occupancy. Zero idle waste detected.";
    return `${idleDetails.length} idle device(s): ${idleDetails.join(", ")}. Est. waste: ₹${idleDetails.length * 18}/hour.`;
  }

  // 12. Overcrowded spaces
  if (query.includes("overcrowded") || query.includes("crowded")) {
    const crowded = roomsList.filter(r => r.peopleCount > 8);
    if (crowded.length === 0) return "All spaces are within safe occupancy thresholds.";
    return `Overcrowded: ${crowded.map(r => `${r.roomName}: ${r.peopleCount} occupants (limit: 8)`).join(", ")}`;
  }

  // 13. Highest risk building
  if (query.includes("highest risk") || query.includes("risk score") || query.includes("most dangerous")) {
    const buildingRisk = {};
    roomsList.forEach(r => {
      const score = r.riskLevel === "CRITICAL" ? 100 : r.riskLevel === "HIGH" ? 75 : r.riskLevel === "MEDIUM" ? 40 : 0;
      buildingRisk[r.facility] = Math.max(buildingRisk[r.facility] || 0, score);
    });
    const sorted = Object.entries(buildingRisk).sort((a, b) => b[1] - a[1]);
    if (sorted[0]?.[1] === 0) return "All buildings are operating at LOW risk. No high-risk zones detected.";
    return `Highest risk building: "${sorted[0][0]}" (Risk Score: ${sorted[0][1]}/100). Immediate attention recommended.`;
  }

  // 14. Actions taken
  if (query.includes("actions") && (query.includes("taken") || query.includes("executed") || query.includes("automated"))) {
    const recent = actionsList.slice(0, 3).map(a => `${a.type} in ${a.roomId} (${a.status})`).join(" | ");
    return `${actionsList.length} actions logged. Recent: ${recent || "None"}. Total energy savings: ₹${metrics.energySavedTodayINR}.`;
  }

  // Default: operational status
  return `SentinelAI X is monitoring ${roomsList.length} spaces. Campus status: ${metrics.occupancyRate}% occupied, Security: ${metrics.securityScore}/100, Safety: ${metrics.safetyScore}/100. ` +
    `Query me about: health scores, energy waste, predictions, compliance, incidents, or specific buildings.`;
};

module.exports = { generateCopilotResponse };
