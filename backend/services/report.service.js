/**
 * SentinelAI X — Daily Executive Report Generator
 * Responsibility: Aggregates operational data from MongoDB into structured business reports.
 * Reports include: energy savings, incidents, actions, occupancy trends, and recommendations.
 */

const { ActionLog, Incident, EventLog } = require("../models/schemas");

/**
 * Generate a daily operational executive report.
 * @param {Array} roomsList - Live room states
 * @param {Object} metrics - Operational metrics
 * @param {Object} healthScores - Health score data
 * @param {Array} incidentsList - All incidents
 * @returns {Object} Structured report
 */
const generateDailyReport = async (roomsList = [], metrics = {}, healthScores = {}, incidentsList = []) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Actions taken today
  const allActions = await ActionLog.find({ timestamp: { $gte: todayStart } }).lean();
  const completedActions = allActions.filter(a => a.status === "completed");
  const failedActions = allActions.filter(a => a.status === "failed");

  // Incidents today
  const todayIncidents = incidentsList.filter(i => new Date(i.timestamp) >= todayStart);
  const resolvedToday = todayIncidents.filter(i => i.status === "resolved");
  const activeIncidents = incidentsList.filter(i => i.status === "active");

  // Energy analysis
  const energyWasteRooms = roomsList.filter(r => r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED");
  const occupiedRooms = roomsList.filter(r => r.occupancyStatus === "Occupied");
  const emptyRooms = roomsList.filter(r => r.occupancyStatus === "Empty");

  // Top risks
  const topRisks = roomsList
    .filter(r => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL")
    .map(r => ({ roomName: r.roomName, facility: r.facility, riskLevel: r.riskLevel }))
    .slice(0, 5);

  // Recommendations engine
  const recommendations = [];
  if (energyWasteRooms.length > 0) {
    recommendations.push({
      priority: "HIGH",
      category: "Energy",
      action: `Implement scheduled eco-shutdown for ${energyWasteRooms.length} room(s) with persistent energy waste.`,
      estimatedSaving: `₹${energyWasteRooms.length * 420}/day`
    });
  }
  if (activeIncidents.filter(i => i.severity === "CRITICAL").length > 0) {
    recommendations.push({
      priority: "CRITICAL",
      category: "Security",
      action: "Dispatch security personnel to resolve critical incidents immediately.",
      estimatedSaving: "Risk mitigation"
    });
  }
  if (completedActions.length > 5) {
    recommendations.push({
      priority: "LOW",
      category: "Operations",
      action: "Review automated action performance — high automation volume indicates recurring issues.",
      estimatedSaving: "Process optimization"
    });
  }
  recommendations.push({
    priority: "MEDIUM",
    category: "Facility",
    action: "Schedule preventive maintenance review for highest-utilization spaces.",
    estimatedSaving: "Equipment longevity"
  });

  return {
    reportTitle: "SentinelAI X — Daily Operational Executive Report",
    generatedAt: now.toISOString(),
    reportDate: now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    period: "Last 24 Hours",

    executiveSummary: {
      campusHealthScore: healthScores?.campus?.score || 0,
      campusStatus: healthScores?.campus?.status || "Unknown",
      totalRoomsMonitored: roomsList.length,
      currentOccupancy: `${occupiedRooms.length}/${roomsList.length} spaces occupied`,
      overallRiskPosture: activeIncidents.some(i => i.severity === "CRITICAL") ? "CRITICAL" :
                         activeIncidents.some(i => i.severity === "HIGH") ? "HIGH" :
                         activeIncidents.length > 0 ? "MEDIUM" : "LOW"
    },

    energy: {
      savedTodayINR: metrics.energySavedTodayINR || 0,
      savedThisWeekINR: metrics.energySavedThisWeekINR || 0,
      projectedAnnualINR: metrics.projectedAnnualSavingsINR || 0,
      carbonReducedKg: metrics.carbonReducedKg || 0,
      equivalentTreesSaved: metrics.equivalentTreesSaved || 0,
      wasteRoomsCount: energyWasteRooms.length,
      automatedShutdowns: completedActions.filter(a => a.type.includes("TURN_OFF")).length
    },

    incidents: {
      todayTotal: todayIncidents.length,
      todayResolved: resolvedToday.length,
      todayActive: todayIncidents.filter(i => i.status === "active").length,
      currentlyActive: activeIncidents.length,
      bySeverity: {
        CRITICAL: activeIncidents.filter(i => i.severity === "CRITICAL").length,
        HIGH: activeIncidents.filter(i => i.severity === "HIGH").length,
        MEDIUM: activeIncidents.filter(i => i.severity === "MEDIUM").length,
        LOW: activeIncidents.filter(i => i.severity === "LOW").length
      },
      averageResolutionTimeMin: resolvedToday.length > 0 ? Math.round(
        resolvedToday.reduce((sum, i) => {
          const created = new Date(i.timestamp);
          const resolved = now; // Approximate
          return sum + (resolved - created) / 60000;
        }, 0) / resolvedToday.length
      ) : 0
    },

    actions: {
      totalToday: allActions.length,
      completed: completedActions.length,
      failed: failedActions.length,
      automationSuccessRate: allActions.length > 0
        ? Math.round((completedActions.length / allActions.length) * 100)
        : 100,
      topActionTypes: Object.entries(
        completedActions.reduce((acc, a) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type, count]) => ({ type, count }))
    },

    occupancy: {
      currentRate: Math.round((occupiedRooms.length / Math.max(1, roomsList.length)) * 100),
      occupiedSpaces: occupiedRooms.map(r => r.roomName),
      emptyWithActiveDevices: emptyRooms.filter(r => r.deviceStates?.lights || r.deviceStates?.fan).map(r => r.roomName)
    },

    topRisks,
    recommendations,

    footer: {
      generatedBy: "SentinelAI X Physical AI Operating System",
      version: "2.0",
      nextReportScheduled: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  };
};

module.exports = { generateDailyReport };
