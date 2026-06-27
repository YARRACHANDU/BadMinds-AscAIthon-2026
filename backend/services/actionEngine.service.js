/**
 * SentinelAI X — Centralized Action Engine & ESP32 Integration Layer
 * Responsibility: Handles actuation scheduling, execution states, and IoT interface abstractions.
 */

const eventTimeline = require("./eventTimeline.service");

// In-memory actions log
const actionsHistory = [];

/**
 * Pluggable ESP32 Integration Layer (IoT Abstraction)
 */
const ESP32Client = {
  ipAddress: process.env.ESP32_IP || null,

  async sendCommand(command, params = {}) {
    if (!this.ipAddress) {
      // Simulate hardware if no IP configured
      console.log(`[IoT Sim] ESP32 simulating command: ${command}`, params);
      return new Promise((resolve) => setTimeout(resolve, 800)); // mock network latency
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

  async turnLightOn() {
    return this.sendCommand("light_on");
  },
  async turnLightOff() {
    return this.sendCommand("light_off");
  },
  async turnFanOn() {
    return this.sendCommand("fan_on");
  },
  async turnFanOff() {
    return this.sendCommand("fan_off");
  },
  async activateAlarm() {
    return this.sendCommand("alarm_on");
  },
  async deactivateAlarm() {
    return this.sendCommand("alarm_off");
  },
  async lockDoor() {
    return this.sendCommand("lock_door");
  },
  async unlockDoor() {
    return this.sendCommand("unlock_door");
  }
};

/**
 * Execute an action on a target room/node.
 * @param {string} roomId - Target room ID
 * @param {string} type - Action type (e.g. TURN_OFF_LIGHTS)
 * @param {Object} details - Additional parameters
 */
const triggerAction = async (roomId, type, details = {}) => {
  const actionId = `ACT_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const newAction = {
    id: actionId,
    roomId,
    type,
    status: "pending",
    timestamp: new Date().toISOString(),
    details: details.reason || `Triggered by decision engine`
  };

  actionsHistory.unshift(newAction);
  eventTimeline.addEvent(roomId, "action", `Action initiated: ${type}`, actionId);

  // Execute asynchronously
  executeActionAsync(newAction);

  return newAction;
};

/**
 * Internal async action worker.
 */
const executeActionAsync = async (action) => {
  const ESM = require("./environmentState.service");
  action.status = "executing";
  action.timestamp = new Date().toISOString();

  let success = false;
  try {
    switch (action.type) {
      case "TURN_ON_LIGHTS":
        success = await ESP32Client.turnLightOn();
        await ESM.updateDeviceState(action.roomId, { lights: true });
        break;
      case "TURN_OFF_LIGHTS":
        success = await ESP32Client.turnLightOff();
        await ESM.updateDeviceState(action.roomId, { lights: false });
        break;
      case "TURN_ON_FAN":
        success = await ESP32Client.turnFanOn();
        await ESM.updateDeviceState(action.roomId, { fan: true });
        break;
      case "TURN_OFF_FAN":
        success = await ESP32Client.turnFanOff();
        await ESM.updateDeviceState(action.roomId, { fan: false });
        break;
      case "ACTIVATE_ALARM":
        success = await ESP32Client.activateAlarm();
        await ESM.updateDeviceState(action.roomId, { alarm: true });
        break;
      case "DEACTIVATE_ALARM":
        success = await ESP32Client.deactivateAlarm();
        await ESM.updateDeviceState(action.roomId, { alarm: false });
        break;
      case "LOCK_DOOR":
        success = await ESP32Client.lockDoor();
        await ESM.updateDeviceState(action.roomId, { doorLocked: true });
        break;
      case "UNLOCK_DOOR":
        success = await ESP32Client.unlockDoor();
        await ESM.updateDeviceState(action.roomId, { doorLocked: false });
        break;
      case "SEND_NOTIFICATION":
      case "CREATE_INCIDENT":
      case "GENERATE_REPORT":
        // Operations intelligence actions
        await new Promise((resolve) => setTimeout(resolve, 500));
        success = true;
        break;
      default:
        console.warn(`[ActionEngine] Unknown action type: ${action.type}`);
        success = false;
    }

    action.status = success ? "completed" : "failed";
  } catch (err) {
    console.error(`[ActionEngine] Error executing action ${action.id}:`, err);
    action.status = "failed";
  }

  action.timestamp = new Date().toISOString();
  eventTimeline.addEvent(
    action.roomId,
    action.status === "completed" ? "info" : "critical",
    `Action ${action.type} status updated: ${action.status.toUpperCase()}`,
    action.id
  );
};

const getActionsHistory = () => actionsHistory;

module.exports = {
  triggerAction,
  getActionsHistory,
  ESP32Client
};
