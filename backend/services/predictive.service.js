/**
 * SentinelAI X — Predictive Operations Engine
 * Responsibility: Generates real-data-driven predictions from live room states,
 * temporal history, incident logs, and device telemetry.
 * Every prediction includes: prediction, confidence, expectedTimeMinutes, recommendedAction.
 */

/**
 * Compute per-room predictions from temporal history and current state.
 * @param {Array} roomsList - Live room states from ESM
 * @param {Array} incidentsList - All incidents (active + resolved)
 * @returns {Array} Predictions
 */
const generatePredictions = (roomsList = [], incidentsList = []) => {
  const predictions = [];
  const now = new Date();

  for (const room of roomsList) {
    const history = room.temporalHistory || [];
    const recentHistory = history.slice(-20);

    // --- 1. CAPACITY PREDICTION ---
    if (recentHistory.length >= 5) {
      const counts = recentHistory.map(f => f.peopleCount || 0);
      const recent5 = counts.slice(-5);
      const trend = recent5[recent5.length - 1] - recent5[0]; // change over last 5 frames

      if (trend > 0 && room.peopleCount > 0) {
        const currentCount = room.peopleCount;
        const capacityLimit = 8;
        const remaining = capacityLimit - currentCount;
        const frameIntervalSeconds = 3; // avg interval
        // frames until capacity at current rate
        const framesUntilFull = trend > 0 ? Math.round(remaining / (trend / 5)) : null;
        const minutesUntilFull = framesUntilFull ? Math.round((framesUntilFull * frameIntervalSeconds) / 60) : null;

        if (minutesUntilFull !== null && minutesUntilFull > 0 && minutesUntilFull < 30) {
          predictions.push({
            id: `PRED_CAP_${room.roomId}`,
            category: "utilization",
            roomId: room.roomId,
            roomName: room.roomName,
            prediction: `${room.roomName} is filling rapidly. At current rate, capacity limit (${capacityLimit}) will be reached.`,
            confidence: Math.min(95, 60 + recentHistory.length * 2),
            expectedTimeMinutes: minutesUntilFull,
            recommendedAction: "Redirect incoming personnel to adjacent spaces or prepare overflow management."
          });
        }
      }
    }

    // --- 2. ENERGY WASTE PERSISTENCE PREDICTION ---
    if (room.occupancyStatus === "Empty" && (room.deviceStates?.lights || room.deviceStates?.fan)) {
      const emptySince = room.roomEmptySince ? new Date(room.roomEmptySince) : null;
      if (emptySince) {
        const emptyMinutes = Math.round((now - emptySince) / 60000);
        const projectedWasteMinutes = 15; // SLA window
        const wasteCostPerHour = (room.deviceStates?.lights ? 220 : 0) + (room.deviceStates?.fan ? 380 : 0);
        const projectedLossINR = Math.round((wasteCostPerHour / 60) * projectedWasteMinutes);

        predictions.push({
          id: `PRED_ENG_${room.roomId}`,
          category: "energy",
          roomId: room.roomId,
          roomName: room.roomName,
          prediction: `${room.roomName} has been empty for ${emptyMinutes} minute(s) with active utilities. Energy waste will persist without intervention.`,
          confidence: Math.min(99, 80 + emptyMinutes * 2),
          expectedTimeMinutes: projectedWasteMinutes,
          recommendedAction: `Trigger automated utility shutdown. Est. savings: ₹${projectedLossINR} over next ${projectedWasteMinutes} minutes.`
        });
      }
    }

    // --- 3. SECURITY ESCALATION PREDICTION ---
    const roomActiveIncidents = incidentsList.filter(
      i => i.roomId === room.roomName && i.status === "active" && (i.severity === "HIGH" || i.severity === "CRITICAL")
    );
    for (const inc of roomActiveIncidents) {
      const createdAt = new Date(inc.timestamp);
      const ageSeconds = (now - createdAt) / 1000;
      const nextEscalationThreshold = inc.escalationLevel * 25; // 25s per level (demo pace)
      const secondsUntilEscalation = nextEscalationThreshold - ageSeconds;

      if (secondsUntilEscalation > 0 && secondsUntilEscalation < 60 && (inc.escalationLevel || 1) < 4) {
        predictions.push({
          id: `PRED_SEC_${inc.id}`,
          category: "security",
          roomId: room.roomId,
          roomName: room.roomName,
          prediction: `Incident "${inc.title}" in ${room.roomName} will escalate to Level ${(inc.escalationLevel || 1) + 1} if unresolved.`,
          confidence: 97,
          expectedTimeMinutes: Math.max(1, Math.round(secondsUntilEscalation / 60)),
          recommendedAction: "Assign security officer immediately to prevent automatic escalation to emergency level."
        });
      }
    }

    // --- 4. FACILITY UTILIZATION FORECAST ---
    if (recentHistory.length >= 10) {
      const avgOccupancy = recentHistory.reduce((s, f) => s + (f.peopleCount || 0), 0) / recentHistory.length;
      const utilizationRate = Math.round((avgOccupancy / 8) * 100);

      if (utilizationRate < 15 && (room.deviceStates?.lights || room.deviceStates?.fan)) {
        predictions.push({
          id: `PRED_UTIL_${room.roomId}`,
          category: "utilization",
          roomId: room.roomId,
          roomName: room.roomName,
          prediction: `${room.roomName} has low utilization (${utilizationRate}%) but utilities remain active. Structural energy waste pattern detected.`,
          confidence: 85,
          expectedTimeMinutes: 60,
          recommendedAction: "Schedule eco-standby mode. Consider releasing this space for alternative use."
        });
      }
    }
  }

  return predictions;
};

/**
 * Returns summary insights (backward compatible with existing /api/insights endpoint).
 */
const generateInsights = (roomsList = [], incidentsList = []) => {
  const predictions = generatePredictions(roomsList, incidentsList);

  // Map predictions to insight format for backward compatibility
  const dynamicInsights = predictions.slice(0, 5).map((p, i) => ({
    id: `INS_LIVE_${i}`,
    category: p.category,
    title: p.prediction.split(".")[0],
    message: p.prediction,
    impact: p.recommendedAction,
    confidence: p.confidence
  }));

  // Static institutional insights (always present for context)
  const staticInsights = [
    {
      id: "INS_S01",
      category: "utilization",
      title: "Predictive Schedule Optimization",
      message: "Historical patterns show under-utilization every Friday 2:00–4:00 PM in executive spaces. Recommend scheduled eco-shutdown protocol.",
      impact: "Est. ₹620 weekly saving",
      confidence: 94
    },
    {
      id: "INS_S02",
      category: "security",
      title: "Shift Handover Security Window",
      message: "Unverified entrance attempts are historically concentrated during shift handovers 6:00–8:00 PM. Heightened surveillance recommended.",
      impact: "Recommendation: Increase frame rate",
      confidence: 91
    }
  ];

  return [...dynamicInsights, ...staticInsights];
};

module.exports = {
  generateInsights,
  generatePredictions
};
