const mongoose = require("mongoose");
const { Schema } = mongoose;

// 1. Organization Schema
const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g. University, Hospital, Factory, Corporate Office, Warehouse, Airport
  createdAt: { type: Date, default: Date.now }
});

// 2. Role Schema
const RoleSchema = new Schema({
  name: { type: String, required: true }, // e.g. SUPER_ADMIN, ORG_ADMIN, FACILITY_MANAGER, SECURITY_OFFICER
  custom: { type: Boolean, default: false },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
});

// 3. User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true }, // e.g. "SECURITY_OFFICER", "FACILITY_MANAGER", etc.
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
});

// 4. Building Schema
const BuildingSchema = new Schema({
  name: { type: String, required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
});

// 5. Floor Schema
const FloorSchema = new Schema({
  name: { type: String, required: true },
  buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
});

// 6. Space Schema
const SpaceSchema = new Schema({
  name: { type: String, required: true },
  spaceType: { type: String, required: true }, // e.g. Classroom, Server Room, Emergency Ward
  floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
  buildingId: { type: Schema.Types.ObjectId, ref: "Building", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  
  // Dynamic Responsibility Owners
  owners: {
    primary: { type: Schema.Types.ObjectId, ref: "User" },
    secondary: { type: Schema.Types.ObjectId, ref: "User" },
    escalation: { type: Schema.Types.ObjectId, ref: "User" },
    emergency: { type: Schema.Types.ObjectId, ref: "User" }
  },

  // Temporal History & Occupancy engine parameters
  temporalHistory: {
    type: [{
      timestamp: { type: Date, default: Date.now },
      peopleCount: { type: Number, default: 0 },
      detectedObjects: [{ type: String }],
      frameConfidence: { type: Number, default: 0.95 }
    }],
    default: []
  },

  occupancyConfidence: { type: Number, default: 100 }, // 0 to 100 percentage
  occupancyStatusDetailed: { type: String, default: "Empty" }, // Occupied, Likely Occupied, Unknown, Likely Empty, Empty
  
  roomEmptySince: { type: Date, default: null },
  roomOccupiedSince: { type: Date, default: null },

  // Trust scores
  trustMetrics: {
    truePositives: { type: Number, default: 24 },
    falsePositives: { type: Number, default: 0 },
    falseNegatives: { type: Number, default: 0 },
    decisionAccuracy: { type: Number, default: 100 }
  },

  // Alert Confidence Thresholds
  thresholds: {
    low: { type: Number, default: 30 },
    medium: { type: Number, default: 50 },
    high: { type: Number, default: 75 },
    critical: { type: Number, default: 90 }
  },

  // Telemetry status
  peopleCount: { type: Number, default: 0 },
  occupancyStatus: { type: String, default: "Empty" }, // Occupied, Empty
  riskLevel: { type: String, default: "LOW" }, // LOW, MEDIUM, HIGH, CRITICAL
  confidence: { type: Number, default: 0.95 },
  statusSummary: { type: String, default: "Nominal" },
  lastUpdated: { type: Date, default: Date.now },

  // Active Device overrides
  deviceStates: {
    lights: { type: Boolean, default: false },
    fan: { type: Boolean, default: false },
    alarm: { type: Boolean, default: false },
    doorLocked: { type: Boolean, default: false }
  },

  // Environmental Telemetry parameters
  environmental: {
    temperature: { type: Number, default: 22.5 },
    humidity: { type: Number, default: 45 },
    airQuality: { type: Number, default: 35 },
    noiseLevel: { type: Number, default: 42 },
    lightingCondition: { type: String, default: "Nominal" },
    smokeDetected: { type: Boolean, default: false },
    waterLeakage: { type: Boolean, default: false },
    blockedExits: { type: Boolean, default: false },
    visibilityCondition: { type: String, default: "Clear" },
    brightnessLevel: { type: Number, default: 50 },
    illuminationScore: { type: Number, default: 50 },
    motionActivity: { type: String, default: "None" },
    fanActivity: { type: String, default: "Not Detected" },
    energyEfficiencyState: { type: String, default: "Normal Operation" },
    lightingStatus: { type: String, default: "Likely OFF" },
    roomState: { type: String, default: "Empty + Dark" }
  },

  // Universal Asset Classification Model
  assets: {
    people: {
      count: { type: Number, default: 0 },
      crowdingState: { type: String, default: "Normal" },
      movementPatterns: { type: String, default: "Static" },
      presenceDurationMin: { type: Number, default: 0 }
    },
    safetyAssets: {
      type: [{
        type: { type: String },
        status: { type: String, default: "Operational" }
      }],
      default: [
        { type: "Fire Extinguisher", status: "Operational" },
        { type: "Emergency Exit Sign", status: "Operational" }
      ]
    },
    infrastructure: {
      type: { type: String, default: "Laboratory" },
      doorsCount: { type: Number, default: 2 },
      windowsCount: { type: Number, default: 4 },
      exitsCount: { type: Number, default: 1 }
    }
  },

  // AI Agent States
  agents: {
    security: {
      observation: { type: String, default: "No movement detected" },
      evidence: { type: String, default: "0 occupants over 20 frames" },
      confidence: { type: Number, default: 0.95 },
      reasoning: { type: String, default: "System normal" },
      decision: { type: String, default: "SECURE" },
      recommendedAction: { type: String, default: "CONTINUE_MONITORING" }
    },
    energy: {
      observation: { type: String, default: "No consumption anomalies" },
      evidence: { type: String, default: "0 occupants over 20 frames" },
      confidence: { type: Number, default: 0.95 },
      reasoning: { type: String, default: "System normal" },
      savingsEstimate: { type: String, default: "₹0.00" },
      decision: { type: String, default: "OPTIMIZED" },
      recommendedAction: { type: String, default: "CONTINUE_MONITORING" }
    },
    safety: {
      observation: { type: String, default: "No safety threats" },
      evidence: { type: String, default: "Egress clear" },
      confidence: { type: Number, default: 0.95 },
      reasoning: { type: String, default: "Egress clear" },
      riskLevel: { type: String, default: "LOW" },
      decision: { type: String, default: "COMPLIANT" },
      action: { type: String, default: "CONTINUE_MONITORING" }
    },
    facility: {
      observation: { type: String, default: "Facility healthy" },
      evidence: { type: String, default: "Equipment state nominal" },
      confidence: { type: Number, default: 0.95 },
      reasoning: { type: String, default: "Facility healthy" },
      decision: { type: String, default: "HEALTHY" },
      facilityHealthScore: { type: Number, default: 100 },
      recommendation: { type: String, default: "Routine maintenance schedules normal" },
      priority: { type: String, default: "LOW" }
    }
  }
});

// 7. Device Schema
const DeviceSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // Camera, Light, Fan, AC, Door Lock, Alarm, Motion Sensor, etc.
  status: { type: String, default: "online" }, // online, offline
  health: { type: Number, default: 100 },
  telemetry: { type: Schema.Types.Mixed, default: {} },
  spaceId: { type: Schema.Types.ObjectId, ref: "Space" },
  floorId: { type: Schema.Types.ObjectId, ref: "Floor" },
  buildingId: { type: Schema.Types.ObjectId, ref: "Building" },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User" }
});

// 8. Incident Schema
const IncidentSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  spaceId: { type: Schema.Types.ObjectId, ref: "Space", required: true },
  floorId: { type: Schema.Types.ObjectId, ref: "Floor" },
  buildingId: { type: Schema.Types.ObjectId, ref: "Building" },
  detectedByAgent: { type: String, required: true }, // Security, Energy, Safety, Facility
  severity: { type: String, required: true }, // LOW, MEDIUM, HIGH, CRITICAL
  status: { type: String, default: "active" }, // active, resolved
  assignedUserId: { type: Schema.Types.ObjectId, ref: "User" },
  escalationLevel: { type: Number, default: 1 }, // 1, 2, 3, 4
  timeline: [
    {
      timestamp: { type: Date, default: Date.now },
      message: { type: String, required: true }
    }
  ],
  actionsTaken: [{ type: String }],
  resolutionNotes: { type: String, default: "" },
  impactScore: { type: Number, default: 0 },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  evidence: {
    detectedObjects: [{ type: String }],
    detectionConfidence: { type: Number },
    frameCount: { type: String },
    occupancyConfidence: { type: Number },
    sourceCamera: { type: String },
    sourceRoom: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 9. ActionLog Schema
const ActionLogSchema = new Schema({
  type: { type: String, required: true }, // e.g. LOCK_DOOR, TURN_OFF_LIGHTS
  spaceId: { type: Schema.Types.ObjectId, ref: "Space", required: true },
  details: { type: String, required: true },
  status: { type: String, default: "completed" }, // pending, executing, completed, failed
  agentResponsible: { type: String, required: true }, // e.g. Security Agent
  reasoning: { type: String, required: true },
  impact: { type: String, required: true },
  confidence: { type: Number, default: 0.95 },
  timestamp: { type: Date, default: Date.now },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  evidenceUsed: { type: String },
  expectedImpact: { type: String },
  sourceIncidentId: { type: Schema.Types.ObjectId, ref: "Incident" },
  sourceIncidentTitle: { type: String }
});

// 10. Notification Schema
const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  message: { type: String, required: true },
  type: { type: String, default: "in-app" }, // in-app, email, slack, whatsapp, etc.
  status: { type: String, default: "unread" }, // unread, read
  timestamp: { type: Date, default: Date.now },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true }
});

// 11. EventLog Schema
const EventLogSchema = new Schema({
  spaceId: { type: Schema.Types.ObjectId, ref: "Space", required: true },
  type: { type: String, required: true }, // info, warning, critical, action
  message: { type: String, required: true },
  referenceId: { type: String },
  timestamp: { type: Date, default: Date.now },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization" }
});

// 12. Detection Schema for Dynamic Frame States
const DetectionSchema = new Schema({
  objects: [{
    label: { type: String, required: true },
    confidence: { type: Number, required: true }
  }],
  confidence: { type: Number, default: 0.95 },
  timestamp: { type: Date, default: Date.now },
  camera: { type: String, required: true },
  space: { type: String, required: true },
  spaceId: { type: Schema.Types.ObjectId, ref: "Space" }
});

module.exports = {
  Organization: mongoose.model("Organization", OrganizationSchema),
  Role: mongoose.model("Role", RoleSchema),
  User: mongoose.model("User", UserSchema),
  Building: mongoose.model("Building", BuildingSchema),
  Floor: mongoose.model("Floor", FloorSchema),
  Space: mongoose.model("Space", SpaceSchema),
  Device: mongoose.model("Device", DeviceSchema),
  Incident: mongoose.model("Incident", IncidentSchema),
  ActionLog: mongoose.model("ActionLog", ActionLogSchema),
  Notification: mongoose.model("Notification", NotificationSchema),
  EventLog: mongoose.model("EventLog", EventLogSchema),
  Detection: mongoose.model("Detection", DetectionSchema)
};

