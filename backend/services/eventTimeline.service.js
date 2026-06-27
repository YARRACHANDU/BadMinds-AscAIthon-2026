/**
 * SentinelAI X — Chronological Event Timeline Service
 * Responsibility: Stores and serves system events, alarms, and state changes to/from MongoDB.
 * Extended with: snapshot support for Digital Twin Timeline Replay, room-filtered queries,
 * and cross-space correlation event logging.
 */

const { EventLog, Space } = require("../models/schemas");

/**
 * Resolve legacy roomId string to a real MongoDB ObjectId.
 */
const resolveSpaceId = async (spaceId) => {
  if (!spaceId) return null;
  if (typeof spaceId === "string" && !spaceId.match(/^[0-9a-fA-F]{24}$/)) {
    const spaceObj = await Space.findOne({ name: { $regex: new RegExp(spaceId.replace(/ROOM_|_/g, " "), "i") } });
    if (spaceObj) return spaceObj._id;
    const firstSpace = await Space.findOne();
    if (firstSpace) return firstSpace._id;
    return null;
  }
  return spaceId;
};

/**
 * Add a new operational event to the database.
 * @param {string} spaceId
 * @param {string} type - 'info' | 'warning' | 'critical' | 'action'
 * @param {string} message
 * @param {string} [referenceId] - Associated action or incident ID
 * @param {Object} [snapshot] - Optional state snapshot for Digital Twin replay
 */
const addEvent = async (spaceId, type, message, referenceId = null, snapshot = null) => {
  try {
    const realSpaceId = await resolveSpaceId(spaceId);
    const spaceDoc = realSpaceId ? await Space.findById(realSpaceId) : null;
    const orgId = spaceDoc ? spaceDoc.organizationId : null;

    const eventData = {
      spaceId: realSpaceId,
      type,
      message,
      referenceId,
      organizationId: orgId
    };

    // Persist snapshot if provided (enables Digital Twin replay)
    if (snapshot) {
      eventData.snapshot = snapshot;
    }

    const event = await EventLog.create(eventData);
    console.log(`[Timeline] [${type.toUpperCase()}] ${message}`);
    return event;
  } catch (error) {
    console.error("Failed to add event log:", error);
    return null;
  }
};

/**
 * Fetch timeline events with optional roomId filter.
 * @param {string|null} spaceId - Optional space filter
 * @param {number} limit - Max events to return
 */
const getEvents = async (spaceId = null, limit = 100) => {
  try {
    const filter = {};
    if (spaceId) {
      const realSpaceId = await resolveSpaceId(spaceId);
      if (realSpaceId) filter.spaceId = realSpaceId;
    }

    const list = await EventLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("spaceId", "name")
      .lean();

    return list.map(evt => ({
      id: evt._id.toString(),
      roomId: evt.spaceId ? evt.spaceId._id?.toString() || evt.spaceId.toString() : "",
      roomName: evt.spaceId?.name || null,
      type: evt.type,
      message: evt.message,
      referenceId: evt.referenceId,
      timestamp: evt.timestamp.toISOString(),
      snapshot: evt.snapshot || null
    }));
  } catch (error) {
    console.error("Failed to get timeline events:", error);
    return [];
  }
};

/**
 * Add a cross-camera movement correlation event.
 * Fired when a person is detected moving between spaces.
 * @param {string} fromSpaceId
 * @param {string} toSpaceId
 * @param {string} fromName
 * @param {string} toName
 */
const addCorrelationEvent = async (fromSpaceId, toSpaceId, fromName, toName) => {
  const message = `Movement Trail: Person tracked from "${fromName}" → "${toName}". Cross-space correlation logged.`;
  await addEvent(toSpaceId, "info", message, `CORR_${fromSpaceId}_${toSpaceId}`);
};

module.exports = {
  addEvent,
  getEvents,
  addCorrelationEvent,
  resolveSpaceId
};
