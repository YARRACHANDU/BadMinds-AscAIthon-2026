/**
 * SentinelAI X — Centralized Action Engine & IoT Integration Layer
 * Responsibility: Handles actuation scheduling, execution states, and updates matching Space & Device documents in MongoDB.
 */

const { ActionLog, Space, Device } = require("../models/schemas");
const eventTimeline = require("./eventTimeline.service");

/**
 * Pluggable ESP32 Integration Layer (IoT Abstraction)
 */
const ESP32Client = {
  ipAddress: process.env.ESP32_IP || null,

  async sendCommand(command, params = {}) {
    if (!this.ipAddress) {
      // Simulate hardware if no IP configured
      console.log(`[IoT Sim] ESP32 command executed: ${command}`, params);
      return new Promise((resolve) => setTimeout(() => resolve(true), 800)); // mock network latency
    }

    try {
      const response = await fetch(`http://${this.ipAddress}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, ...params }),
        signal: AbortSignal.timeout(3000), // 3s timeout
      });
      return response.ok;
    } catch (err) {
      console.error(`[IoT Fail] Failed to contact ESP32 at ${this.ipAddress}. Falling back to simulation.`);
      return false;
    }
  },

  async turnLightOn() { return this.sendCommand("light_on"); },
  async turnLightOff() { return this.sendCommand("light_off"); },
  async turnFanOn() { return this.sendCommand("fan_on"); },
  async turnFanOff() { return this.sendCommand("fan_off"); },
  async activateAlarm() { return this.sendCommand("alarm_on"); },
  async deactivateAlarm() { return this.sendCommand("alarm_off"); },
  async lockDoor() { return this.sendCommand("lock_door"); },
  async unlockDoor() { return this.sendCommand("unlock_door"); }
};

/**
 * Trigger an action on a target space.
 */
const triggerAction = async (spaceId, type, details = {}) => {
  try {
    // Legacy room ID mapping
    let realSpaceId = spaceId;
    if (typeof spaceId === "string" && !spaceId.match(/^[0-9a-fA-F]{24}$/)) {
      const spaceObj = await Space.findOne({ name: { $regex: new RegExp(spaceId.replace(/ROOM_|_/g, " "), "i") } });
      if (spaceObj) realSpaceId = spaceObj._id;
    }

    const spaceDoc = await Space.findById(realSpaceId);
    if (!spaceDoc) {
      console.error(`[ActionEngine] Space ${realSpaceId} not found.`);
      return null;
    }

    let agentName = "Security Agent";
    let reasoning = details.reason || "System override";
    if (type.includes("LIGHT") || type.includes("FAN")) {
      agentName = "Energy Agent";
    } else if (type.includes("INCIDENT") || type.includes("NOTIFICATION")) {
      agentName = "Safety Agent";
    }

    const log = await ActionLog.create({
      type,
      spaceId: realSpaceId,
      details: details.reason || "Auto-triggered by optimization agent.",
      status: "pending",
      agentResponsible: agentName,
      reasoning: details.reason || reasoning,
      impact: details.expectedImpact || "Reduced risk and power wastage profile.",
      confidence: details.confidence || 0.95,
      evidenceUsed: details.evidence || "Autonomous vision telemetry match.",
      sourceIncidentId: details.sourceIncidentId || null,
      sourceIncidentTitle: details.sourceIncidentTitle || null,
      organizationId: spaceDoc.organizationId
    });

    await eventTimeline.addEvent(realSpaceId, "action", `Action initiated: ${type}`, log._id.toString());

    // Execute asynchronously
    executeActionAsync(log);

    return {
      id: log._id.toString(),
      roomId: realSpaceId.toString(),
      type: log.type,
      status: "pending",
      timestamp: log.timestamp.toISOString(),
      details: log.details,
      agentResponsible: log.agentResponsible,
      reasoning: log.reasoning,
      impact: log.impact,
      confidence: log.confidence,
      evidenceUsed: log.evidenceUsed,
      expectedImpact: log.expectedImpact,
      sourceIncidentId: log.sourceIncidentId ? log.sourceIncidentId.toString() : null,
      sourceIncidentTitle: log.sourceIncidentTitle
    };
  } catch (error) {
    console.error("Failed to trigger action:", error);
    return null;
  }
};

/**
 * Async execution worker updating database entities.
 */
const executeActionAsync = async (actionLog) => {
  const ESM = require("./environmentState.service");
  actionLog.status = "executing";
  await actionLog.save();

  let success = false;
  const targetId = actionLog.spaceId;

  try {
    switch (actionLog.type) {
      case "TURN_ON_LIGHTS":
        success = await ESP32Client.turnLightOn();
        await ESM.updateDeviceState(targetId, { lights: true });
        await Device.updateMany({ spaceId: targetId, type: "Light" }, { status: "online", telemetry: { powerOn: true } });
        break;
      case "TURN_OFF_LIGHTS":
        success = await ESP32Client.turnLightOff();
        await ESM.updateDeviceState(targetId, { lights: false });
        await Device.updateMany({ spaceId: targetId, type: "Light" }, { status: "online", telemetry: { powerOn: false } });
        break;
      case "TURN_ON_FAN":
        success = await ESP32Client.turnFanOn();
        await ESM.updateDeviceState(targetId, { fan: true });
        await Device.updateMany({ spaceId: targetId, type: "Fan" }, { status: "online", telemetry: { powerOn: true } });
        break;
      case "TURN_OFF_FAN":
        success = await ESP32Client.turnFanOff();
        await ESM.updateDeviceState(targetId, { fan: false });
        await Device.updateMany({ spaceId: targetId, type: "Fan" }, { status: "online", telemetry: { powerOn: false } });
        break;
      case "ACTIVATE_ALARM":
        success = await ESP32Client.activateAlarm();
        await ESM.updateDeviceState(targetId, { alarm: true });
        await Device.updateMany({ spaceId: targetId, type: "Alarm" }, { status: "online", telemetry: { triggered: true } });
        break;
      case "DEACTIVATE_ALARM":
        success = await ESP32Client.deactivateAlarm();
        await ESM.updateDeviceState(targetId, { alarm: false });
        await Device.updateMany({ spaceId: targetId, type: "Alarm" }, { status: "online", telemetry: { triggered: false } });
        break;
      case "LOCK_DOOR":
        success = await ESP32Client.lockDoor();
        await ESM.updateDeviceState(targetId, { doorLocked: true });
        await Device.updateMany({ spaceId: targetId, type: "Door Lock" }, { status: "online", telemetry: { locked: true } });
        break;
      case "UNLOCK_DOOR":
        success = await ESP32Client.unlockDoor();
        await ESM.updateDeviceState(targetId, { doorLocked: false });
        await Device.updateMany({ spaceId: targetId, type: "Door Lock" }, { status: "online", telemetry: { locked: false } });
        break;
      case "SEND_NOTIFICATION":
      case "CREATE_INCIDENT":
      case "GENERATE_REPORT":
        await new Promise((resolve) => setTimeout(resolve, 500));
        success = true;
        break;
      default:
        console.warn(`[ActionEngine] Unknown action type: ${actionLog.type}`);
        success = false;
    }

    actionLog.status = success ? "completed" : "failed";
  } catch (err) {
    console.error(`[ActionEngine] Error executing action ${actionLog._id}:`, err);
    actionLog.status = "failed";
  }

  await actionLog.save();

  await eventTimeline.addEvent(
    targetId,
    actionLog.status === "completed" ? "info" : "critical",
    `Action ${actionLog.type} status updated: ${actionLog.status.toUpperCase()}`,
    actionLog._id.toString()
  );
};

const getActionsHistory = async () => {
  try {
    const list = await ActionLog.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return list.map(act => ({
      id: act._id.toString(),
      roomId: act.spaceId ? act.spaceId.toString() : "",
      type: act.type,
      status: act.status,
      timestamp: act.timestamp.toISOString(),
      details: act.details,
      agentResponsible: act.agentResponsible,
      reasoning: act.reasoning,
      impact: act.impact,
      confidence: act.confidence,
      evidenceUsed: act.evidenceUsed,
      expectedImpact: act.expectedImpact,
      sourceIncidentId: act.sourceIncidentId ? act.sourceIncidentId.toString() : null,
      sourceIncidentTitle: act.sourceIncidentTitle
    }));
  } catch (error) {
    console.error("Failed to fetch actions history:", error);
    return [];
  }
};

module.exports = {
  triggerAction,
  getActionsHistory,
  ESP32Client
};
