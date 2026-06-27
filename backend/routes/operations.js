/**
 * SentinelAI 2.0 — Operations & Security Intelligence API Router
 */

const express = require("express");
const router = express.Router();

const ESM = require("../services/environmentState.service");
const actionEngine = require("../services/actionEngine.service");
const incidentService = require("../services/incident.service");
const predictiveService = require("../services/predictive.service");
const eventTimeline = require("../services/eventTimeline.service");

/**
 * GET /api/metrics
 * Returns global operational metrics for the campus dashboard
 */
router.get("/metrics", (req, res) => {
  try {
    const metrics = ESM.getMetrics();
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/actions
 * Returns the history of executed and pending actuator actions
 */
router.get("/actions", (req, res) => {
  try {
    const actions = actionEngine.getActionsHistory();
    res.json({ success: true, count: actions.length, actions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/incidents
 * Returns historical and active incidents
 */
router.get("/incidents", (req, res) => {
  try {
    const incidents = incidentService.getIncidents();
    res.json({ success: true, count: incidents.length, incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/incidents/:incidentId/resolve
 * Manually resolves an active incident
 */
router.post("/incidents/:incidentId/resolve", (req, res) => {
  try {
    const resolved = incidentService.resolveIncident(req.params.incidentId);
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
    const incidentsList = incidentService.getIncidents();
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
router.get("/timeline", (req, res) => {
  try {
    const events = eventTimeline.getEvents();
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
    if (typeof state !== "boolean" || !["lights", "fan", "alarm"].includes(device)) {
      return res.status(400).json({ error: "Invalid device or state parameters." });
    }

    const updatedRoom = await ESM.updateDeviceState(req.params.roomId, { [device]: state });
    if (!updatedRoom) {
      return res.status(404).json({ error: `Room ${req.params.roomId} not found.` });
    }

    // Log the manual override
    eventTimeline.addEvent(
      req.params.roomId,
      "action",
      `Manual Override: Switched ${device.toUpperCase()} to ${state ? "ON" : "OFF"}`
    );

    res.json({ success: true, room: updatedRoom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
