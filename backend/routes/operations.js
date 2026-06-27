/**
 * SentinelAI X — Operations & Security Intelligence API Router
 */

const express = require("express");
const router = express.Router();

const ESM = require("../services/environmentState.service");
const actionEngine = require("../services/actionEngine.service");
const incidentService = require("../services/incident.service");
const predictiveService = require("../services/predictive.service");
const eventTimeline = require("../services/eventTimeline.service");
const copilotService = require("../services/copilot.service");

/**
 * GET /api/metrics
 * Returns global operational & ROI metrics for the campus dashboard
 */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await ESM.getMetrics();
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/actions
 * Returns the history of executed and pending actuator actions
 */
router.get("/actions", async (req, res) => {
  try {
    const actions = await actionEngine.getActionsHistory();
    res.json({ success: true, count: actions.length, actions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/incidents
 * Returns historical and active incidents
 */
router.get("/incidents", async (req, res) => {
  try {
    const incidents = await incidentService.getIncidents();
    res.json({ success: true, count: incidents.length, incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incidents/:incidentId/resolve
 * Manually resolves an active incident
 */
router.post("/incidents/:incidentId/resolve", async (req, res) => {
  try {
    const resolved = await incidentService.resolveIncident(req.params.incidentId);
    if (!resolved) {
      return res.status(404).json({ error: "Incident not found or already resolved." });
    }
    res.json({ success: true, message: "Incident resolved." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/insights
 * Returns predictive intelligence and operations insights
 */
router.get("/insights", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const insights = predictiveService.generateInsights(roomsList, incidentsList);
    res.json({ success: true, insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/timeline
 * Returns event timeline logs
 */
router.get("/timeline", async (req, res) => {
  try {
    const events = await eventTimeline.getEvents();
    res.json({ success: true, count: events.length, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rooms/:roomId/device
 * Direct device override controls from the commander dashboard
 */
router.post("/rooms/:roomId/device", async (req, res) => {
  try {
    const { device, state } = req.body;
    const allowedDevices = ["lights", "fan", "alarm", "doorLocked"];
    if (typeof state !== "boolean" || !allowedDevices.includes(device)) {
      return res.status(400).json({ error: "Invalid device or state parameters." });
    }

    const updatedRoom = await ESM.updateDeviceState(req.params.roomId, { [device]: state });
    if (!updatedRoom) {
      return res.status(404).json({ error: `Room ${req.params.roomId} not found.` });
    }

    // Log manual override
    await eventTimeline.addEvent(
      req.params.roomId,
      "action",
      `Manual Override: Switched ${device.toUpperCase()} to ${state ? "ON" : "OFF"}`
    );

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/copilot/chat
 * Generative AI Copilot assistant completions
 */
router.post("/copilot/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }
    const response = await copilotService.generateCopilotResponse(message);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DYNAMIC ORGANIZATION MANAGEMENT API ROUTES
// ==========================================

const { Organization, Building, Floor, Space, Device, User, Role } = require("../models/schemas");

// Buildings Endpoint
router.get("/buildings", async (req, res) => {
  try {
    const list = await Building.find().lean();
    res.json({ success: true, buildings: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/buildings", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Building name required" });
    
    // Find or create default organization
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: "Centennial University Campus", type: "University" });
    }

    const b = await Building.create({ name, organizationId: org._id });
    res.json({ success: true, building: b });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Floors Endpoint
router.get("/floors", async (req, res) => {
  try {
    const list = await Floor.find().populate("buildingId").lean();
    res.json({ success: true, floors: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/floors", async (req, res) => {
  try {
    const { name, buildingId } = req.body;
    if (!name || !buildingId) return res.status(400).json({ error: "Name and buildingId required" });

    const b = await Building.findById(buildingId);
    if (!b) return res.status(404).json({ error: "Building not found" });

    const f = await Floor.create({ name, buildingId, organizationId: b.organizationId });
    res.json({ success: true, floor: f });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users/Owners Endpoint
router.get("/users", async (req, res) => {
  try {
    const list = await User.find().lean();
    res.json({ success: true, users: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Name, email, and role required" });

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({ name: "Centennial University Campus", type: "University" });
    }

    const u = await User.create({ name, email, role, organizationId: org._id });
    res.json({ success: true, user: u });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spaces Endpoint
router.post("/spaces", async (req, res) => {
  try {
    const { name, spaceType, floorId, buildingId, primaryOwner, secondaryOwner, escalationOwner, emergencyOwner } = req.body;
    if (!name || !spaceType || !floorId || !buildingId) {
      return res.status(400).json({ error: "name, spaceType, floorId, and buildingId required" });
    }

    const b = await Building.findById(buildingId);
    if (!b) return res.status(404).json({ error: "Building not found" });

    const s = await Space.create({
      name,
      spaceType,
      floorId,
      buildingId,
      organizationId: b.organizationId,
      owners: {
        primary: primaryOwner || null,
        secondary: secondaryOwner || null,
        escalation: escalationOwner || null,
        emergency: emergencyOwner || null
      },
      deviceStates: { lights: true, fan: true, alarm: false, doorLocked: false }
    });

    res.json({ success: true, space: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Devices Endpoint
router.post("/devices", async (req, res) => {
  try {
    const { name, type, spaceId } = req.body;
    if (!name || !type || !spaceId) {
      return res.status(400).json({ error: "name, type, and spaceId required" });
    }

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });

    const dev = await Device.create({
      name,
      type,
      spaceId,
      floorId: space.floorId,
      buildingId: space.buildingId,
      organizationId: space.organizationId,
      ownerId: space.owners.primary || null
    });

    res.json({ success: true, device: dev });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
