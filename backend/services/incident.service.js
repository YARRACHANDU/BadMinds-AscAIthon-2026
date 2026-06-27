/**
 * SentinelAI 2.0 — Incident Management System
 * Responsibility: Tracks operational incidents, auto-generates tickets, and manages incident lifecycles.
 */

const eventTimeline = require("./eventTimeline.service");

const incidents = [];

/**
 * Creates a new incident.
 * @param {string} roomId 
 * @param {string} title 
 * @param {string} description 
 * @param {string} severity - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 */
const createIncident = (roomId, title, description, severity) => {
  // Check if an unresolved incident with the same title already exists for the room to avoid duplicates
  const duplicate = incidents.find(inc => inc.roomId === roomId && inc.title === title && inc.status === "active");
  if (duplicate) return duplicate;

  const incident = {
    id: `INC_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    roomId,
    title,
    description,
    severity,
    status: "active",
    timestamp: new Date().toISOString(),
    resolvedAt: null
  };

  incidents.unshift(incident);
  eventTimeline.addEvent(
    roomId,
    severity === "CRITICAL" || severity === "HIGH" ? "critical" : "warning",
    `New Incident Created [${severity}]: ${title}`,
    incident.id
  );

  return incident;
};

/**
 * Resolves an active incident.
 * @param {string} incidentId 
 */
const resolveIncident = (incidentId) => {
  const incident = incidents.find(inc => inc.id === incidentId);
  if (incident && incident.status === "active") {
    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();
    eventTimeline.addEvent(
      incident.roomId,
      "info",
      `Incident Resolved: ${incident.title}`,
      incident.id
    );
    return true;
  }
  return false;
};

/**
 * Automatically resolve incidents of a specific title in a room when the condition clears.
 * @param {string} roomId
 * @param {string} title
 */
const autoResolveIncident = (roomId, title) => {
  const activeIncidents = incidents.filter(inc => inc.roomId === roomId && inc.title === title && inc.status === "active");
  activeIncidents.forEach(inc => {
    inc.status = "resolved";
    inc.resolvedAt = new Date().toISOString();
    eventTimeline.addEvent(
      roomId,
      "info",
      `Auto-Resolved Incident: ${inc.title}`,
      inc.id
    );
  });
};

const getIncidents = (roomId = null) => {
  if (roomId) {
    return incidents.filter(i => i.roomId === roomId);
  }
  return incidents;
};

module.exports = {
  createIncident,
  resolveIncident,
  autoResolveIncident,
  getIncidents
};
