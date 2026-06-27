/**
 * SentinelAI X — Physical AI Memory Engine
 * Responsibility: Learns and persists historical operational patterns.
 * Analyzes temporal history and event logs to surface long-term insights.
 */

const { EventLog, Incident, ActionLog, Space } = require("../models/schemas");

/**
 * Analyze patterns from live room states and historical data.
 * @param {Array} roomsList - Live room states with temporalHistory
 * @param {Array} incidentsList - All incidents
 * @returns {Object} Learned patterns and insights
 */
const analyzePatterns = async (roomsList = [], incidentsList = []) => {
  const now = new Date();

  // 1. Most active rooms (by people presence across temporal history)
  const roomActivity = roomsList.map(room => {
    const history = room.temporalHistory || [];
    const totalPresence = history.reduce((sum, f) => sum + (f.peopleCount || 0), 0);
    const framesWithPeople = history.filter(f => f.peopleCount > 0).length;
    const utilizationRate = history.length > 0
      ? Math.round((framesWithPeople / history.length) * 100)
      : 0;

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      facility: room.facility,
      totalPresenceCount: totalPresence,
      utilizationRate,
      averageOccupancy: history.length > 0
        ? parseFloat((totalPresence / history.length).toFixed(1))
        : 0
    };
  }).sort((a, b) => b.utilizationRate - a.utilizationRate);

  // 2. Frequent incident patterns per room
  const incidentPatterns = {};
  for (const inc of incidentsList) {
    const key = inc.roomId || "Unknown";
    if (!incidentPatterns[key]) incidentPatterns[key] = {};
    incidentPatterns[key][inc.severity] = (incidentPatterns[key][inc.severity] || 0) + 1;
  }

  const frequentIncidentRooms = Object.entries(incidentPatterns)
    .map(([roomName, counts]) => ({
      roomName,
      totalIncidents: Object.values(counts).reduce((a, b) => a + b, 0),
      bySeverity: counts
    }))
    .sort((a, b) => b.totalIncidents - a.totalIncidents)
    .slice(0, 5);

  // 3. Energy waste hotspots
  const energyHotspots = roomsList
    .filter(r => r.agents?.energy?.decision === "ENERGY_WASTAGE_DETECTED")
    .map(r => ({
      roomId: r.roomId,
      roomName: r.roomName,
      facility: r.facility,
      lightsOn: r.deviceStates?.lights || false,
      fanOn: r.deviceStates?.fan || false,
      emptyDuration: r.roomEmptySince
        ? Math.round((now - new Date(r.roomEmptySince)) / 60000) + " minutes"
        : "Unknown"
    }));

  // 4. Peak risk periods (from event log timestamps)
  const recentEvents = await EventLog.find({ type: { $in: ["critical", "warning"] } })
    .sort({ timestamp: -1 })
    .limit(200)
    .lean();

  const hourlyRiskCount = new Array(24).fill(0);
  for (const event of recentEvents) {
    const hour = new Date(event.timestamp).getHours();
    hourlyRiskCount[hour]++;
  }

  const peakHour = hourlyRiskCount.indexOf(Math.max(...hourlyRiskCount));
  const peakRiskPeriods = hourlyRiskCount
    .map((count, hour) => ({ hour: `${String(hour).padStart(2,"0")}:00`, count }))
    .filter(h => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Automation effectiveness
  const completedActions = await ActionLog.find({ status: "completed" }).limit(100).lean();
  const failedActions = await ActionLog.find({ status: "failed" }).limit(100).lean();
  const automationRate = (completedActions.length + failedActions.length) > 0
    ? Math.round((completedActions.length / (completedActions.length + failedActions.length)) * 100)
    : 100;

  return {
    generatedAt: now.toISOString(),
    mostActiveRooms: roomActivity.slice(0, 5),
    frequentIncidentRooms,
    energyWasteHotspots: energyHotspots,
    peakRiskPeriods,
    peakRiskHour: peakHour,
    automationEffectiveness: {
      successRate: automationRate,
      totalActionsAnalyzed: completedActions.length + failedActions.length,
      completedActions: completedActions.length,
      failedActions: failedActions.length
    },
    longTermInsights: [
      roomActivity.length > 0
        ? `"${roomActivity[0]?.roomName}" is the most active space with ${roomActivity[0]?.utilizationRate}% occupancy utilization.`
        : "Insufficient data for utilization analysis.",
      energyHotspots.length > 0
        ? `${energyHotspots.length} room(s) are recurring energy waste hotspots.`
        : "No persistent energy waste hotspots detected.",
      peakRiskPeriods.length > 0
        ? `Peak risk activity occurs at ${peakRiskPeriods[0]?.hour}. Consider enhanced monitoring during this period.`
        : "Risk distribution is uniform across operating hours.",
      `Automation success rate: ${automationRate}%. ${automationRate >= 95 ? "System is operating at peak efficiency." : "Review failed actions to improve reliability."}`
    ]
  };
};

module.exports = { analyzePatterns };
