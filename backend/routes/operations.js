/**
 * SentinelAI X — Operations & Security Intelligence API Router
 * Extended with: Predictions, SOP Engine, Health Scores, Compliance, Report, Memory,
 * Camera Auto-Onboarding, Timeline Replay, Alert Routing Rules, and Device Telemetry.
 */

const express = require("express");
const router = express.Router();

const ESM = require("../services/environmentState.service");
const actionEngine = require("../services/actionEngine.service");
const incidentService = require("../services/incident.service");
const predictiveService = require("../services/predictive.service");
const eventTimeline = require("../services/eventTimeline.service");
const copilotService = require("../services/copilot.service");
const sopService = require("../services/sop.service");
const healthScoreService = require("../services/healthScore.service");
const complianceService = require("../services/compliance.service");
const reportService = require("../services/report.service");
const memoryService = require("../services/memory.service");

const { Organization, Building, Floor, Space, Device, User, Role } = require("../models/schemas");

// =====================================================
// CORE OPERATIONAL ENDPOINTS
// =====================================================

/** GET /api/metrics — Global operational & ROI metrics */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await ESM.getMetrics();
    res.json({ success: true, metrics });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/actions — History of executed actuator actions */
router.get("/actions", async (req, res) => {
  try {
    const actions = await actionEngine.getActionsHistory();
    res.json({ success: true, count: actions.length, actions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/incidents — All incidents */
router.get("/incidents", async (req, res) => {
  try {
    const incidents = await incidentService.getIncidents();
    res.json({ success: true, count: incidents.length, incidents });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/incidents/:incidentId/resolve — Resolve an incident */
router.post("/incidents/:incidentId/resolve", async (req, res) => {
  try {
    const resolved = await incidentService.resolveIncident(req.params.incidentId);
    if (!resolved) return res.status(404).json({ error: "Incident not found or already resolved." });
    res.json({ success: true, message: "Incident resolved." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/insights — Predictive insights (backward compatible) */
router.get("/insights", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const insights = predictiveService.generateInsights(roomsList, incidentsList);
    res.json({ success: true, insights });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/timeline — Event timeline (all events or filtered by ?roomId=) */
router.get("/timeline", async (req, res) => {
  try {
    const { roomId, limit } = req.query;
    const events = await eventTimeline.getEvents(roomId || null, parseInt(limit) || 100);
    res.json({ success: true, count: events.length, events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/rooms/:roomId/device — Device state override */
router.post("/rooms/:roomId/device", async (req, res) => {
  try {
    const { device, state } = req.body;
    const allowedDevices = ["lights", "fan", "alarm", "doorLocked"];
    if (typeof state !== "boolean" || !allowedDevices.includes(device)) {
      return res.status(400).json({ error: "Invalid device or state parameters." });
    }
    const updatedRoom = await ESM.updateDeviceState(req.params.roomId, { [device]: state });
    if (!updatedRoom) return res.status(404).json({ error: `Room ${req.params.roomId} not found.` });
    await eventTimeline.addEvent(req.params.roomId, "action", `Manual Override: ${device.toUpperCase()} → ${state ? "ON" : "OFF"}`);
    res.json({ success: true, room: updatedRoom });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/copilot/chat — Generative AI Copilot */
router.post("/copilot/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required." });
    const response = await copilotService.generateCopilotResponse(message);
    res.json({ success: true, response });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// PREDICTIVE OPERATIONS ENGINE
// =====================================================

/** GET /api/predictions — Per-room real-data-driven predictions */
router.get("/predictions", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const predictions = predictiveService.generatePredictions(roomsList, incidentsList);
    res.json({ success: true, count: predictions.length, predictions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// SOP EXECUTION ENGINE
// =====================================================

/** GET /api/sops — List all SOP templates */
router.get("/sops", (req, res) => {
  try {
    const templates = sopService.getSOPTemplates();
    res.json({ success: true, count: templates.length, templates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/sops/execute — Manually trigger an SOP for a space */
router.post("/sops/execute", async (req, res) => {
  try {
    const { sopName, spaceId, triggeredBy } = req.body;
    if (!sopName || !spaceId) return res.status(400).json({ error: "sopName and spaceId are required." });
    const execution = await sopService.executeSOP(sopName, spaceId, triggeredBy || "manual");
    res.json({ success: true, execution });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** GET /api/sops/active — Get currently running SOPs */
router.get("/sops/active", (req, res) => {
  try {
    const active = sopService.getActiveSops();
    res.json({ success: true, count: active.length, active });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// ORGANIZATION HEALTH SCORES
// =====================================================

/** GET /api/health-scores — Campus, building, room health scores */
router.get("/health-scores", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const healthScores = healthScoreService.computeHealthScores(roomsList, incidentsList);
    res.json({ success: true, healthScores });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// AI COMPLIANCE AUDITOR
// =====================================================

/** GET /api/compliance — Run compliance audit against live state */
router.get("/compliance", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const report = complianceService.runComplianceAudit(roomsList);
    res.json({ success: true, report });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// DAILY EXECUTIVE REPORT
// =====================================================

/** GET /api/report/daily — Generate daily executive report */
router.get("/report/daily", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const metrics = await ESM.getMetrics();
    const healthScores = healthScoreService.computeHealthScores(roomsList, incidentsList);
    const report = await reportService.generateDailyReport(roomsList, metrics, healthScores, incidentsList);
    res.json({ success: true, report });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// PHYSICAL AI MEMORY
// =====================================================

/** GET /api/memory/patterns — Learned operational patterns */
router.get("/memory/patterns", async (req, res) => {
  try {
    const roomsList = await ESM.getAllRooms();
    const incidentsList = await incidentService.getIncidents();
    const patterns = await memoryService.analyzePatterns(roomsList, incidentsList);
    res.json({ success: true, patterns });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// ALERT ROUTING RULES
// =====================================================

const alertRoutingRules = {
  UNAUTHORIZED_ACCESS: { role: "SECURITY_OFFICER", escalation: "SECURITY_OFFICER" },
  ENERGY_WASTAGE: { role: "FACILITY_MANAGER", escalation: "FACILITY_MANAGER" },
  SAFETY_HAZARD: { role: "SAFETY_OFFICER", escalation: "FACILITY_MANAGER" },
  CROWD_OVERFLOW: { role: "SAFETY_OFFICER", escalation: "FACILITY_MANAGER" },
  DEVICE_FAILURE: { role: "FACILITY_MANAGER", escalation: "FACILITY_MANAGER" },
  DEFAULT: { role: "FACILITY_MANAGER", escalation: "FACILITY_MANAGER" }
};

/** GET /api/alert-routing/rules — Current alert routing configuration */
router.get("/alert-routing/rules", (req, res) => {
  res.json({ success: true, rules: alertRoutingRules });
});

/** PUT /api/alert-routing/rules — Update routing rules */
router.put("/alert-routing/rules", (req, res) => {
  try {
    const updates = req.body;
    Object.assign(alertRoutingRules, updates);
    res.json({ success: true, rules: alertRoutingRules });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// CCTV AUTO-ONBOARDING
// =====================================================

/** POST /api/cameras/register — Register a new CCTV camera */
router.post("/cameras/register", async (req, res) => {
  try {
    const { rtspUrl, name, spaceId, type = "Camera" } = req.body;
    if (!name || !spaceId) return res.status(400).json({ error: "name and spaceId are required." });

    // Validate RTSP URL format if provided
    if (rtspUrl && !rtspUrl.startsWith("rtsp://") && !rtspUrl.startsWith("http://") && !rtspUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid stream URL. Must start with rtsp://, http://, or https://" });
    }

    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ error: "Space not found." });

    const camera = await Device.create({
      name,
      type,
      spaceId,
      floorId: space.floorId,
      buildingId: space.buildingId,
      organizationId: space.organizationId,
      rtspUrl: rtspUrl || null,
      autoMapped: true,
      streamActive: !!rtspUrl,
      status: "online"
    });

    await eventTimeline.addEvent(spaceId, "info", `Camera Auto-Onboarded: "${name}" mapped to ${space.name}${rtspUrl ? ` — Stream: ${rtspUrl}` : ""}`);

    res.json({
      success: true,
      camera: {
        id: camera._id.toString(),
        name: camera.name,
        type: camera.type,
        spaceId: camera.spaceId.toString(),
        spaceName: space.name,
        rtspUrl: camera.rtspUrl,
        autoMapped: camera.autoMapped,
        streamActive: camera.streamActive
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/cameras — List all registered cameras */
router.get("/cameras", async (req, res) => {
  try {
    const cameras = await Device.find({ type: "Camera" })
      .populate("spaceId", "name")
      .populate("buildingId", "name")
      .lean();
    res.json({
      success: true,
      count: cameras.length,
      cameras: cameras.map(c => ({
        id: c._id.toString(),
        name: c.name,
        spaceName: c.spaceId?.name || "Unknown",
        buildingName: c.buildingId?.name || "Unknown",
        status: c.status,
        rtspUrl: c.rtspUrl,
        streamActive: c.streamActive,
        autoMapped: c.autoMapped
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// DEVICE TELEMETRY
// =====================================================

/** POST /api/devices/:deviceId/telemetry — Ingest IoT sensor telemetry */
router.post("/devices/:deviceId/telemetry", async (req, res) => {
  try {
    const { powerConsumptionW, temperature, humidity, batteryLevel } = req.body;
    const device = await Device.findById(req.params.deviceId);
    if (!device) return res.status(404).json({ error: "Device not found." });

    device.telemetry = {
      ...device.telemetry,
      powerConsumptionW: powerConsumptionW ?? device.telemetry?.powerConsumptionW,
      temperature: temperature ?? device.telemetry?.temperature,
      humidity: humidity ?? device.telemetry?.humidity,
      batteryLevel: batteryLevel ?? device.telemetry?.batteryLevel,
      lastUpdated: new Date().toISOString()
    };
    device.lastPingAt = new Date();
    device.status = "online";
    await device.save();

    res.json({ success: true, deviceId: device._id.toString(), telemetry: device.telemetry });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/devices — List all devices with telemetry */
router.get("/devices", async (req, res) => {
  try {
    const devices = await Device.find().populate("spaceId", "name").lean();
    res.json({
      success: true,
      count: devices.length,
      devices: devices.map(d => ({
        id: d._id.toString(),
        name: d.name,
        type: d.type,
        status: d.status,
        spaceName: d.spaceId?.name || "Unknown",
        telemetry: d.telemetry,
        rtspUrl: d.rtspUrl,
        streamActive: d.streamActive
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================
// ORGANIZATION MANAGEMENT ENDPOINTS
// =====================================================

router.get("/buildings", async (req, res) => {
  try {
    const list = await Building.find().lean();
    res.json({ success: true, buildings: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/buildings", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Building name required" });
    let org = await Organization.findOne();
    if (!org) org = await Organization.create({ name: "Centennial University Campus", type: "University" });
    const b = await Building.create({ name, organizationId: org._id });
    res.json({ success: true, building: b });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/floors", async (req, res) => {
  try {
    const list = await Floor.find().populate("buildingId").lean();
    res.json({ success: true, floors: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/floors", async (req, res) => {
  try {
    const { name, buildingId } = req.body;
    if (!name || !buildingId) return res.status(400).json({ error: "Name and buildingId required" });
    const b = await Building.findById(buildingId);
    if (!b) return res.status(404).json({ error: "Building not found" });
    const f = await Floor.create({ name, buildingId, organizationId: b.organizationId });
    res.json({ success: true, floor: f });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/users", async (req, res) => {
  try {
    const list = await User.find().lean();
    res.json({ success: true, users: list });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/users", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Name, email, and role required" });
    let org = await Organization.findOne();
    if (!org) org = await Organization.create({ name: "Centennial University Campus", type: "University" });
    const u = await User.create({ name, email, role, organizationId: org._id });
    res.json({ success: true, user: u });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/spaces", async (req, res) => {
  try {
    const { name, spaceType, floorId, buildingId, primaryOwner, secondaryOwner, escalationOwner, emergencyOwner } = req.body;
    if (!name || !spaceType || !floorId || !buildingId) {
      return res.status(400).json({ error: "name, spaceType, floorId, and buildingId required" });
    }
    const b = await Building.findById(buildingId);
    if (!b) return res.status(404).json({ error: "Building not found" });
    const s = await Space.create({
      name, spaceType, floorId, buildingId,
      organizationId: b.organizationId,
      owners: { primary: primaryOwner || null, secondary: secondaryOwner || null, escalation: escalationOwner || null, emergency: emergencyOwner || null },
      deviceStates: { lights: true, fan: true, alarm: false, doorLocked: false }
    });
    res.json({ success: true, space: s });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/devices", async (req, res) => {
  try {
    const { name, type, spaceId } = req.body;
    if (!name || !type || !spaceId) return res.status(400).json({ error: "name, type, and spaceId required" });
    const space = await Space.findById(spaceId);
    if (!space) return res.status(404).json({ error: "Space not found" });
    const dev = await Device.create({
      name, type, spaceId,
      floorId: space.floorId,
      buildingId: space.buildingId,
      organizationId: space.organizationId,
      ownerId: space.owners.primary || null
    });
    res.json({ success: true, device: dev });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
