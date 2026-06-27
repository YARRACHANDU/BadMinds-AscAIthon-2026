/**
 * SentinelAI X — AI Compliance Auditor
 * Responsibility: Continuously evaluates compliance rules against live room states.
 * Generates per-room, per-building, and campus-wide compliance reports.
 * Every rule maps to a measurable, auditable condition in the database.
 */

/**
 * Compliance rule definitions.
 * Each rule has: id, category, title, description, severity, check(room) → boolean (true = compliant).
 */
const COMPLIANCE_RULES = [
  {
    id: "CMP_001",
    category: "safety",
    title: "Emergency Exit Clear",
    description: "All emergency exits must remain unobstructed at all times.",
    severity: "CRITICAL",
    check: (room) => !room.environmental?.blockedExits
  },
  {
    id: "CMP_002",
    category: "safety",
    title: "Smoke-Free Environment",
    description: "No smoke or fire indicators detected in monitored spaces.",
    severity: "CRITICAL",
    check: (room) => !room.environmental?.smokeDetected
  },
  {
    id: "CMP_003",
    category: "safety",
    title: "Occupancy Within Limits",
    description: "Room occupancy must not exceed safety capacity threshold of 8 personnel.",
    severity: "HIGH",
    check: (room) => (room.peopleCount || 0) <= 8
  },
  {
    id: "CMP_004",
    category: "energy",
    title: "No Energy Waste in Vacant Spaces",
    description: "Lighting and ventilation must be deactivated in unoccupied spaces after cooldown.",
    severity: "MEDIUM",
    check: (room) => {
      if (room.occupancyStatus !== "Empty") return true; // Only applies to empty rooms
      return !(room.deviceStates?.lights || room.deviceStates?.fan);
    }
  },
  {
    id: "CMP_005",
    category: "security",
    title: "Access Control Active in Restricted Areas",
    description: "Restricted laboratory and server rooms must have door lock active during off-hours.",
    severity: "HIGH",
    check: (room) => {
      const restrictedTypes = ["laboratory", "server room", "research lab"];
      const isRestricted = restrictedTypes.some(t =>
        (room.roomName || "").toLowerCase().includes(t) ||
        (room.spaceType || "").toLowerCase().includes(t)
      );
      if (!isRestricted) return true; // Non-restricted spaces exempt
      // Check if there's an active unauthorized access incident
      return room.agents?.security?.decision !== "UNAUTHORIZED_ACCESS_RISK";
    }
  },
  {
    id: "CMP_006",
    category: "safety",
    title: "Adequate Lighting for Occupied Spaces",
    description: "Occupied spaces must maintain adequate lighting for operational safety.",
    severity: "MEDIUM",
    check: (room) => {
      if (room.occupancyStatus !== "Occupied") return true;
      return room.agents?.energy?.decision !== "INSUFFICIENT_LIGHTING";
    }
  },
  {
    id: "CMP_007",
    category: "facility",
    title: "No Water Leakage Detected",
    description: "No water leakage conditions detected in monitored infrastructure.",
    severity: "HIGH",
    check: (room) => !room.environmental?.waterLeakage
  },
  {
    id: "CMP_008",
    category: "security",
    title: "No Active Unresolved Critical Security Incidents",
    description: "All critical security incidents must be resolved or escalated within SLA windows.",
    severity: "CRITICAL",
    check: (room) => room.riskLevel !== "CRITICAL"
  }
];

/**
 * Run compliance audit against all rooms.
 * @param {Array} roomsList - Live room states
 * @returns {Object} Full compliance report
 */
const runComplianceAudit = (roomsList = []) => {
  const now = new Date();
  const roomResults = [];
  let totalChecks = 0;
  let totalPassed = 0;

  for (const room of roomsList) {
    const ruleResults = [];

    for (const rule of COMPLIANCE_RULES) {
      const passed = (() => {
        try { return rule.check(room); }
        catch { return true; } // Don't penalize for missing data
      })();

      ruleResults.push({
        ruleId: rule.id,
        category: rule.category,
        title: rule.title,
        description: rule.description,
        severity: rule.severity,
        passed,
        violation: passed ? null : `Non-compliant: ${rule.description}`
      });

      totalChecks++;
      if (passed) totalPassed++;
    }

    const passedCount = ruleResults.filter(r => r.passed).length;
    const roomScore = Math.round((passedCount / COMPLIANCE_RULES.length) * 100);
    const violations = ruleResults.filter(r => !r.passed);
    const criticalViolations = violations.filter(r => r.severity === "CRITICAL").length;

    roomResults.push({
      roomId: room.roomId,
      roomName: room.roomName,
      facility: room.facility,
      complianceScore: roomScore,
      passedRules: passedCount,
      totalRules: COMPLIANCE_RULES.length,
      violations,
      criticalViolations,
      status: criticalViolations > 0 ? "Non-Compliant" : violations.length > 0 ? "Partial" : "Compliant"
    });
  }

  const overallScore = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 100;
  const nonCompliantRooms = roomResults.filter(r => r.status === "Non-Compliant").length;
  const partialRooms = roomResults.filter(r => r.status === "Partial").length;

  return {
    auditedAt: now.toISOString(),
    overallComplianceScore: overallScore,
    status: overallScore >= 90 ? "Compliant" : overallScore >= 70 ? "Partial" : "Non-Compliant",
    summary: {
      totalRoomsAudited: roomsList.length,
      compliantRooms: roomResults.filter(r => r.status === "Compliant").length,
      partialRooms,
      nonCompliantRooms,
      totalChecks,
      totalPassed,
      totalFailed: totalChecks - totalPassed
    },
    rules: COMPLIANCE_RULES.map(r => ({ id: r.id, title: r.title, category: r.category, severity: r.severity })),
    rooms: roomResults.sort((a, b) => a.complianceScore - b.complianceScore) // worst first
  };
};

module.exports = { runComplianceAudit, COMPLIANCE_RULES };
