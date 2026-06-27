/**
 * SentinelAI 2.0 — Chronological Event Timeline Service
 * Responsibility: Stores and serves system events, alarms, and state changes.
 */

const events = [];

/**
 * Add a new operational event to the chronological log.
 * @param {string} roomId 
 * @param {string} type - 'info' | 'warning' | 'critical' | 'action'
 * @param {string} message 
 * @param {string} referenceId - Associated action or incident ID
 */
const addEvent = (roomId, type, message, referenceId = null) => {
  const event = {
    id: `EVT_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    roomId,
    type,
    message,
    referenceId,
    timestamp: new Date().toISOString()
  };

  events.unshift(event);
  
  // Cap at 200 events in memory
  if (events.length > 200) {
    events.pop();
  }

  console.log(`[Timeline] [${type.toUpperCase()}] Room: ${roomId} — ${message}`);
  return event;
};

const getEvents = (roomId = null) => {
  if (roomId) {
    return events.filter(e => e.roomId === roomId);
  }
  return events;
};

module.exports = {
  addEvent,
  getEvents
};
