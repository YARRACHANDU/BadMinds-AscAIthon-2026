/**
 * SentinelAI X — Chronological Event Timeline Service
 * Responsibility: Stores and serves system events, alarms, and state changes to/from MongoDB.
 */

const { EventLog, Space } = require("../models/schemas");

/**
 * Add a new operational event to the database.
 * @param {string} spaceId 
 * @param {string} type - 'info' | 'warning' | 'critical' | 'action'
 * @param {string} message 
 * @param {string} referenceId - Associated action or incident ID
 */
const addEvent = async (spaceId, type, message, referenceId = null) => {
  try {
    // If it's a legacy roomId string (e.g. ROOM_ENG_101), map it to the corresponding seeded Space ID
    let realSpaceId = spaceId;
    if (typeof spaceId === "string" && !spaceId.match(/^[0-9a-fA-F]{24}$/)) {
      const spaceObj = await Space.findOne({ name: { $regex: new RegExp(spaceId.replace(/ROOM_|_/g, " "), "i") } });
      if (spaceObj) {
        realSpaceId = spaceObj._id;
      } else {
        // Fallback: search for any space
        const firstSpace = await Space.findOne();
        if (firstSpace) realSpaceId = firstSpace._id;
      }
    }

    const spaceDoc = await Space.findById(realSpaceId);
    const orgId = spaceDoc ? spaceDoc.organizationId : null;

    const event = await EventLog.create({
      spaceId: realSpaceId,
      type,
      message,
      referenceId,
      organizationId: orgId
    });

    console.log(`[Database Timeline] [${type.toUpperCase()}] Space: ${realSpaceId} — ${message}`);
    return event;
  } catch (error) {
    console.error("Failed to add event log:", error);
    return null;
  }
};

/**
 * Fetch timeline events
 */
const getEvents = async (spaceId = null) => {
  try {
    const filter = {};
    if (spaceId) {
      let realSpaceId = spaceId;
      if (typeof spaceId === "string" && !spaceId.match(/^[0-9a-fA-F]{24}$/)) {
        const spaceObj = await Space.findOne({ name: { $regex: new RegExp(spaceId.replace(/ROOM_|_/g, " "), "i") } });
        if (spaceObj) realSpaceId = spaceObj._id;
      }
      filter.spaceId = realSpaceId;
    }

    const list = await EventLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    // Map to expected frontend layout (roomId instead of spaceId)
    return list.map(evt => ({
      id: evt._id.toString(),
      roomId: evt.spaceId ? evt.spaceId.toString() : "",
      type: evt.type,
      message: evt.message,
      referenceId: evt.referenceId,
      timestamp: evt.timestamp.toISOString()
    }));
  } catch (error) {
    console.error("Failed to get timeline events:", error);
    return [];
  }
};

module.exports = {
  addEvent,
  getEvents
};
