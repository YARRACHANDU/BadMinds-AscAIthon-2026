/**
 * ============================================================
 * SentinelAI — Environment State Manager Service
 * ============================================================
 * Responsibility: Maintain the latest known state of every
 * monitored room. This service has NO AI reasoning logic —
 * it purely tracks, compares, and updates environment data.
 *
 * Storage: In-memory JavaScript Map (MongoDB-ready for v2).
 * Architecture: Service Layer (SOLID — Single Responsibility)
 * ============================================================
 */

// ---------------------------------------------------------------------------
// In-memory store — keyed by roomId
// ---------------------------------------------------------------------------
const rooms = new Map();

// ---------------------------------------------------------------------------
// Default State Template
// Every new room is initialized with these safe default values.
// ---------------------------------------------------------------------------
const createDefaultState = (roomId, cameraId) => ({
  roomId,
  cameraId: cameraId || roomId,         // fallback cameraId = roomId
  peopleCount: 0,
  detectedObjects: [],                   // array of label strings
  occupancyStatus: "Empty",             // "Occupied" | "Empty"
  roomEmptySince: new Date().toISOString(), // set immediately on creation
  lastActivityTime: null,               // last time someone was detected
  currentAlert: null,                   // { type, message, severity, timestamp }
  lastUpdated: new Date().toISOString(),
  confidence: 0,                        // average confidence of last detections
  frameCount: 0,                        // total frames processed for this room
});

// ---------------------------------------------------------------------------
// HELPER — Calculate occupancyStatus from peopleCount
// ---------------------------------------------------------------------------
const calcOccupancyStatus = (peopleCount) =>
  peopleCount > 0 ? "Occupied" : "Empty";

// ---------------------------------------------------------------------------
// HELPER — Calculate average confidence from an objects array
// objects: [{ label, confidence }, ...]
// ---------------------------------------------------------------------------
const calcAverageConfidence = (objects) => {
  if (!objects || objects.length === 0) return 0;
  const total = objects.reduce((sum, obj) => sum + (obj.confidence || 0), 0);
  return parseFloat((total / objects.length).toFixed(3));
};

// ---------------------------------------------------------------------------
// HELPER — Extract plain label strings from Afferens objects array
// ---------------------------------------------------------------------------
const extractLabels = (objects) => {
  if (!objects || !Array.isArray(objects)) return [];
  return objects.map((obj) => obj.label || "unknown");
};

// ---------------------------------------------------------------------------
// createRoom(roomId, cameraId)
// Creates a new room with default state.
// Returns: the new room state object.
// ---------------------------------------------------------------------------
const createRoom = async (roomId, cameraId) => {
  if (!roomId) throw new Error("roomId is required to create a room.");

  if (rooms.has(roomId)) {
    // Room already exists — return existing state
    return rooms.get(roomId);
  }

  const state = createDefaultState(roomId, cameraId);
  rooms.set(roomId, state);

  console.log(`[ESM] Room created: ${roomId} (camera: ${cameraId || roomId})`);
  return state;
};

// ---------------------------------------------------------------------------
// getRoom(roomId)
// Returns the current state of a specific room.
// Returns: room state object, or null if not found.
// ---------------------------------------------------------------------------
const getRoom = async (roomId) => {
  if (!roomId) throw new Error("roomId is required.");
  return rooms.get(roomId) || null;
};

// ---------------------------------------------------------------------------
// getAllRooms()
// Returns an array of all room state objects.
// ---------------------------------------------------------------------------
const getAllRooms = async () => {
  return Array.from(rooms.values());
};

// ---------------------------------------------------------------------------
// deleteRoom(roomId)
// Removes a room from the store.
// Returns: true if deleted, false if not found.
// ---------------------------------------------------------------------------
const deleteRoom = async (roomId) => {
  if (!rooms.has(roomId)) return false;
  rooms.delete(roomId);
  console.log(`[ESM] Room deleted: ${roomId}`);
  return true;
};

// ---------------------------------------------------------------------------
// updateRoom(roomId, partialState)
// Merges a partial state object into an existing room.
// Used internally and externally for direct field overrides.
// ---------------------------------------------------------------------------
const updateRoom = async (roomId, partialState) => {
  if (!roomId) throw new Error("roomId is required.");

  let current = rooms.get(roomId);
  if (!current) {
    // Auto-create room if it doesn't exist
    current = await createRoom(roomId, partialState.cameraId);
  }

  const updated = {
    ...current,
    ...partialState,
    lastUpdated: new Date().toISOString(),
  };

  rooms.set(roomId, updated);
  return updated;
};

// ---------------------------------------------------------------------------
// updateEnvironmentState(roomId, perceptionData)
// *** MAIN ENTRY POINT ***
//
// Processes a new Afferens perception payload for a given room.
// 1. Find or create the room.
// 2. Extract people count and object list.
// 3. Compare with previous state.
// 4. Update only the changed fields.
// 5. Handle roomEmptySince transitions.
// 6. Return { previous, updated, changes } diff object.
// ---------------------------------------------------------------------------
const updateEnvironmentState = async (roomId, perceptionData, cameraId) => {
  if (!roomId) throw new Error("roomId is required.");
  if (!perceptionData) throw new Error("perceptionData is required.");

  // 1. Find or auto-create the room
  let previous = rooms.get(roomId);
  if (!previous) {
    previous = await createRoom(roomId, cameraId);
  }

  // 2. Extract key fields from the Afferens perception payload
  //    Supports both direct objects array and nested data.objects
  const objects =
    perceptionData.objects ||
    perceptionData.data?.objects ||
    [];

  const newPeopleCount = objects.filter(
    (obj) => obj.label === "person"
  ).length;

  const newLabels = extractLabels(objects);
  const newConfidence = calcAverageConfidence(objects);
  const newOccupancy = calcOccupancyStatus(newPeopleCount);
  const now = new Date().toISOString();

  // 3. Build the updated state patch
  const patch = {
    peopleCount: newPeopleCount,
    detectedObjects: newLabels,
    occupancyStatus: newOccupancy,
    confidence: newConfidence,
    frameCount: (previous.frameCount || 0) + 1,
    lastUpdated: now,
  };

  // 4. Handle occupancy transitions
  const wasOccupied = previous.peopleCount > 0;
  const isNowOccupied = newPeopleCount > 0;

  if (wasOccupied && !isNowOccupied) {
    // Room just became empty — record the timestamp
    patch.roomEmptySince = now;
    console.log(`[ESM] ${roomId} → Room is now EMPTY (set roomEmptySince).`);
  } else if (!wasOccupied && isNowOccupied) {
    // Room was empty — people detected again — clear the empty timestamp
    patch.roomEmptySince = null;
    patch.lastActivityTime = now;
    console.log(`[ESM] ${roomId} → Occupancy RESTORED (cleared roomEmptySince).`);
  } else if (isNowOccupied) {
    // Still occupied — update last activity time
    patch.lastActivityTime = now;
  }

  // 5. Detect which fields actually changed (for change-aware consumers)
  const changes = {};
  const fieldsToCheck = [
    "peopleCount",
    "occupancyStatus",
    "detectedObjects",
    "confidence",
  ];

  for (const field of fieldsToCheck) {
    const prevVal = JSON.stringify(previous[field]);
    const nextVal = JSON.stringify(patch[field]);
    if (prevVal !== nextVal) {
      changes[field] = { from: previous[field], to: patch[field] };
    }
  }

  // 6. Persist the updated state
  const updated = {
    ...previous,
    ...patch,
  };
  rooms.set(roomId, updated);

  const hasChanges = Object.keys(changes).length > 0;
  if (hasChanges) {
    console.log(`[ESM] ${roomId} → State updated. Changes:`, changes);
  } else {
    console.log(`[ESM] ${roomId} → No state changes detected.`);
  }

  // 7. Return structured diff object for downstream consumers
  return {
    roomId,
    updated,
    previous,
    changes,
    hasChanges,
  };
};

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------
module.exports = {
  createRoom,
  getRoom,
  getAllRooms,
  deleteRoom,
  updateRoom,
  updateEnvironmentState,
};
