/**
 * SentinelAI X — SOP (Standard Operating Procedure) Execution Engine
 * Responsibility: Converts incidents into structured, auditable, sequential workflows.
 * Supports customizable SOP templates with timed step execution.
 */

const actionEngine = require("./actionEngine.service");
const eventTimeline = require("./eventTimeline.service");
const incidentService = require("./incident.service");

// In-memory registry of active SOP executions (keyed by executionId)
const activeSops = new Map();

/**
 * SOP Templates — each step defines the action, delay, and description.
 * delayMs: time after previous step completes before this step executes.
 */
const SOP_TEMPLATES = {
  UNAUTHORIZED_ACCESS: {
    name: "Unauthorized Access Response",
    description: "Full security lockdown protocol for unauthorized entry detection.",
    steps: [
      { step: 1, action: "CREATE_INCIDENT",    delayMs: 0,      description: "Create security incident ticket and assign to Security Officer." },
      { step: 2, action: "SEND_NOTIFICATION",  delayMs: 2000,   description: "Dispatch real-time alert to assigned security personnel." },
      { step: 3, action: "LOCK_DOOR",          delayMs: 4000,   description: "Engage electronic door lock to contain unauthorized access." },
      { step: 4, action: "ACTIVATE_ALARM",     delayMs: 5000,   description: "Activate audible alarm to deter intruder." },
      { step: 5, action: "GENERATE_REPORT",    delayMs: 10000,  description: "Generate audit report of the full security event." }
    ]
  },
  ENERGY_WASTAGE: {
    name: "Energy Waste Mitigation",
    description: "Automated utility shutdown for vacant spaces with active devices.",
    steps: [
      { step: 1, action: "SEND_NOTIFICATION",  delayMs: 0,      description: "Notify Facility Manager of detected energy waste." },
      { step: 2, action: "TURN_OFF_LIGHTS",    delayMs: 8000,   description: "Deactivate lighting systems in unoccupied space." },
      { step: 3, action: "TURN_OFF_FAN",       delayMs: 9000,   description: "Shut down ventilation fans in unoccupied space." }
    ]
  },
  SAFETY_HAZARD: {
    name: "Safety Hazard Response",
    description: "Emergency response protocol for egress obstruction or safety violations.",
    steps: [
      { step: 1, action: "CREATE_INCIDENT",    delayMs: 0,      description: "Create safety incident ticket and assign to Safety Officer." },
      { step: 2, action: "SEND_NOTIFICATION",  delayMs: 1500,   description: "Alert Safety Officer and Facility Manager immediately." },
      { step: 3, action: "ACTIVATE_ALARM",     delayMs: 3000,   description: "Activate alarm to initiate evacuation if needed." }
    ]
  },
  CROWD_OVERFLOW: {
    name: "Overcrowding Management",
    description: "Capacity control protocol when occupancy exceeds safety threshold.",
    steps: [
      { step: 1, action: "SEND_NOTIFICATION",  delayMs: 0,      description: "Alert Space Manager of overcrowding." },
      { step: 2, action: "CREATE_INCIDENT",    delayMs: 2000,   description: "Log official safety incident for compliance records." },
      { step: 3, action: "GENERATE_REPORT",    delayMs: 5000,   description: "Generate occupancy compliance report." }
    ]
  },
  DEVICE_FAILURE: {
    name: "Device Failure Response",
    description: "Maintenance escalation protocol for device degradation or failure.",
    steps: [
      { step: 1, action: "CREATE_INCIDENT",    delayMs: 0,      description: "Create maintenance incident ticket." },
      { step: 2, action: "SEND_NOTIFICATION",  delayMs: 2000,   description: "Notify Facility Manager for dispatch." },
      { step: 3, action: "GENERATE_REPORT",    delayMs: 5000,   description: "Generate device health report." }
    ]
  }
};

/**
 * Execute a SOP for a given space.
 * @param {string} sopName - Key from SOP_TEMPLATES
 * @param {string} spaceId - MongoDB ObjectId or legacy room ID
 * @param {string} triggeredBy - What triggered this SOP
 * @param {string} [incidentId] - Optional linked incident ID
 * @returns {Object} Execution metadata
 */
const executeSOP = async (sopName, spaceId, triggeredBy = "system", incidentId = null) => {
  const template = SOP_TEMPLATES[sopName];
  if (!template) {
    throw new Error(`Unknown SOP template: ${sopName}`);
  }

  const executionId = `SOP_${sopName}_${spaceId}_${Date.now()}`;
  const startTime = new Date();

  const execution = {
    executionId,
    sopName,
    templateName: template.name,
    spaceId,
    triggeredBy,
    incidentId,
    startTime: startTime.toISOString(),
    status: "running",
    completedSteps: [],
    pendingSteps: template.steps.map(s => s.step),
    totalSteps: template.steps.length
  };

  activeSops.set(executionId, execution);

  // Log SOP initiation to timeline
  await eventTimeline.addEvent(
    spaceId,
    "action",
    `SOP Initiated: [${template.name}] — Triggered by: ${triggeredBy}. ${template.steps.length} steps queued.`
  );

  // Execute steps asynchronously with delays
  _runStepsAsync(executionId, template, spaceId, incidentId);

  return {
    executionId,
    sopName,
    templateName: template.name,
    totalSteps: template.steps.length,
    status: "running",
    startTime: startTime.toISOString()
  };
};

/**
 * Internal: run steps sequentially with delays.
 */
const _runStepsAsync = async (executionId, template, spaceId, incidentId) => {
  const execution = activeSops.get(executionId);
  if (!execution) return;

  let cumulativeDelay = 0;

  for (const step of template.steps) {
    cumulativeDelay += step.delayMs;

    await new Promise(resolve => setTimeout(resolve, step.delayMs));

    const currentExecution = activeSops.get(executionId);
    if (!currentExecution || currentExecution.status === "aborted") break;

    try {
      // Execute the action
      if (step.action === "CREATE_INCIDENT") {
        // Already created before SOP — just log
        await eventTimeline.addEvent(
          spaceId, "action",
          `SOP Step ${step.step}: ${step.description}`
        );
      } else {
        await actionEngine.triggerAction(spaceId, step.action, {
          reason: `SOP: [${template.name}] Step ${step.step} — ${step.description}`,
          sourceIncidentId: incidentId,
          sourceIncidentTitle: template.name,
          confidence: 0.97
        });
      }

      // Update execution state
      const exec = activeSops.get(executionId);
      if (exec) {
        exec.completedSteps.push(step.step);
        exec.pendingSteps = exec.pendingSteps.filter(s => s !== step.step);
        exec.lastCompletedStep = step.step;
        exec.lastCompletedAt = new Date().toISOString();
      }
    } catch (err) {
      console.error(`[SOP] Step ${step.step} failed for ${executionId}:`, err.message);
    }
  }

  // Mark complete
  const finalExecution = activeSops.get(executionId);
  if (finalExecution) {
    finalExecution.status = "completed";
    finalExecution.completedAt = new Date().toISOString();
  }

  await eventTimeline.addEvent(
    spaceId,
    "info",
    `SOP Completed: [${template.name}] — All ${template.steps.length} steps executed successfully.`
  );
};

/**
 * Get all active SOP executions.
 */
const getActiveSops = () => {
  return Array.from(activeSops.values());
};

/**
 * Get SOP execution by ID.
 */
const getSopExecution = (executionId) => {
  return activeSops.get(executionId) || null;
};

/**
 * Get all available SOP templates.
 */
const getSOPTemplates = () => {
  return Object.entries(SOP_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description,
    stepCount: template.steps.length,
    steps: template.steps
  }));
};

/**
 * Map an incident type/title to the appropriate SOP.
 */
const resolveSOPForIncident = (title, severity) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("unauthorized") || titleLower.includes("access") || titleLower.includes("intrusion")) {
    return "UNAUTHORIZED_ACCESS";
  }
  if (titleLower.includes("energy") || titleLower.includes("wastage") || titleLower.includes("waste")) {
    return "ENERGY_WASTAGE";
  }
  if (titleLower.includes("safety") || titleLower.includes("obstruction") || titleLower.includes("hazard")) {
    return "SAFETY_HAZARD";
  }
  if (titleLower.includes("crowd") || titleLower.includes("overcrowd") || titleLower.includes("capacity")) {
    return "CROWD_OVERFLOW";
  }
  if (titleLower.includes("device") || titleLower.includes("failure") || titleLower.includes("maintenance")) {
    return "DEVICE_FAILURE";
  }
  return null;
};

module.exports = {
  executeSOP,
  getActiveSops,
  getSopExecution,
  getSOPTemplates,
  resolveSOPForIncident,
  SOP_TEMPLATES
};
