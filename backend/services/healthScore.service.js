/**
 * SentinelAI X — Organization Health Score Engine
 * Responsibility: Computes real-time health scores for rooms, buildings, and campus
 * based on incident severity, energy efficiency, safety compliance, and device states.
 * Every score is derived from live MongoDB state — no hardcoded values.
 */

const { Space, Building, Incident } = require("../models/schemas");

/**
 * Compute health scores for the entire organization.
 * @param {Array} roomsList - Live room states from ESM.getAllRooms()
 * @param {Array} incidentsList - All incidents
 * @returns {Object} { campus, buildings, rooms }
 */
const computeHealthScores = (roomsList = [], incidentsList = []) => {
  const now = new Date();

  // Per-room scores
  const roomScores = roomsList.map(room => {
    let score = 100;
    const factors = [];

    // 1. Active incidents deduction
    const roomIncidents = incidentsList.filter(
      i => i.roomId === room.roomName && i.status === "active"
    );
    for (const inc of roomIncidents) {
      if (inc.severity === "CRITICAL") { score -= 25; factors.push("Critical incident active (-25)"); }
      else if (inc.severity === "HIGH")  { score -= 15; factors.push("High severity incident active (-15)"); }
      else if (inc.severity === "MEDIUM"){ score -= 8;  factors.push("Medium incident active (-8)"); }
      else                               { score -= 3;  factors.push("Low incident active (-3)"); }
    }

    // 2. Energy efficiency
    const energyDecision = room.agents?.energy?.decision;
    if (energyDecision === "ENERGY_WASTAGE_DETECTED") {
      score -= 10; factors.push("Energy waste detected (-10)");
    } else if (energyDecision === "INSUFFICIENT_LIGHTING") {
      score -= 5; factors.push("Insufficient lighting (-5)");
    }

    // 3. Safety compliance
    const safetyDecision = room.agents?.safety?.decision;
    if (safetyDecision === "SAFETY_HAZARD_DETECTED") {
      score -= 15; factors.push("Safety hazard detected (-15)");
    } else if (safetyDecision === "CROWD_LIMIT_EXCEEDED") {
      score -= 10; factors.push("Overcrowding detected (-10)");
    }

    // 4. Security posture
    const securityDecision = room.agents?.security?.decision;
    if (securityDecision === "UNAUTHORIZED_ACCESS_RISK") {
      score -= 20; factors.push("Unauthorized access risk (-20)");
    }

    // 5. Risk level
    if (room.riskLevel === "CRITICAL") { score -= 10; factors.push("CRITICAL risk level (-10)"); }
    else if (room.riskLevel === "HIGH") { score -= 5; factors.push("HIGH risk level (-5)"); }

    // 6. Device states positive bonus (active + occupied)
    if (room.occupancyStatus === "Occupied" && room.deviceStates?.lights) {
      score += 2; factors.push("Proper lighting in occupied space (+2)");
    }

    // 7. Environmental anomalies
    if (room.environmental?.smokeDetected) { score -= 20; factors.push("Smoke detected (-20)"); }
    if (room.environmental?.blockedExits)  { score -= 12; factors.push("Exit blocked (-12)"); }

    score = Math.max(0, Math.min(100, score));

    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
    const status = score >= 80 ? "Healthy" : score >= 60 ? "Warning" : "Critical";

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      facility: room.facility,
      score,
      grade,
      status,
      factors,
      riskLevel: room.riskLevel,
      activeIncidentCount: roomIncidents.length
    };
  });

  // Per-building scores (group by facility name)
  const buildingMap = {};
  for (const rs of roomScores) {
    if (!buildingMap[rs.facility]) {
      buildingMap[rs.facility] = { scores: [], rooms: [] };
    }
    buildingMap[rs.facility].scores.push(rs.score);
    buildingMap[rs.facility].rooms.push(rs);
  }

  const buildingScores = Object.entries(buildingMap).map(([name, data]) => {
    const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
    const grade = avg >= 90 ? "A" : avg >= 75 ? "B" : avg >= 60 ? "C" : avg >= 40 ? "D" : "F";
    const status = avg >= 80 ? "Healthy" : avg >= 60 ? "Warning" : "Critical";
    const criticalRooms = data.rooms.filter(r => r.status === "Critical").length;
    return {
      name,
      score: avg,
      grade,
      status,
      roomCount: data.scores.length,
      criticalRooms,
      rooms: data.rooms
    };
  });

  // Campus-wide score
  const allScores = roomScores.map(r => r.score);
  const campusAvg = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 100;

  const campusGrade = campusAvg >= 90 ? "A" : campusAvg >= 75 ? "B" : campusAvg >= 60 ? "C" : campusAvg >= 40 ? "D" : "F";
  const campusStatus = campusAvg >= 80 ? "Operational" : campusAvg >= 60 ? "Degraded" : "Critical";

  const totalActiveIncidents = incidentsList.filter(i => i.status === "active").length;
  const criticalIncidents = incidentsList.filter(i => i.status === "active" && i.severity === "CRITICAL").length;

  return {
    generatedAt: now.toISOString(),
    campus: {
      score: campusAvg,
      grade: campusGrade,
      status: campusStatus,
      totalRooms: roomScores.length,
      totalActiveIncidents,
      criticalIncidents,
      healthyRooms: roomScores.filter(r => r.status === "Healthy").length,
      warningRooms: roomScores.filter(r => r.status === "Warning").length,
      criticalRooms: roomScores.filter(r => r.status === "Critical").length
    },
    buildings: buildingScores.sort((a, b) => a.score - b.score), // worst first
    rooms: roomScores.sort((a, b) => a.score - b.score) // worst first
  };
};

module.exports = { computeHealthScores };
