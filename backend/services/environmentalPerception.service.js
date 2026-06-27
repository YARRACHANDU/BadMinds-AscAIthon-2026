/**
 * SentinelAI X — Environmental Perception & Room State Engine Service
 * Responsibility: Performs spatial illumination mapping, motion level assessment,
 * fan state tracking, and evaluates Energy Agent rules.
 */

/**
 * Analyze a frame payload and compute/simulate environmental intelligence.
 * @param {string} roomId - The unique room identifier.
 * @param {string} image - Base64 frame image from webcam or HUD.
 * @param {Object} space - Space Mongoose document containing current state.
 * @param {Object} [clientEnvironmental] - Pre-calculated data from frontend webcam analysis.
 * @returns {Object} Calculated environmental properties.
 */
const analyzeFrame = (roomId, image, space, clientEnvironmental = null) => {
  const peopleCount = space.peopleCount || 0;
  const deviceStates = space.deviceStates || { lights: false, fan: false };
  const occupancy = peopleCount > 0 ? "Occupied" : "Empty";

  let brightnessLevel = 12;
  let illuminationScore = 12;
  let motionActivity = "None";
  let fanActivity = "Not Detected";
  let lightingStatus = "Likely OFF";
  let lightingCondition = "Dark Room Detected";

  // 1. If client computed environmental telemetry is available, utilize it.
  if (clientEnvironmental && typeof clientEnvironmental === "object") {
    brightnessLevel = clientEnvironmental.brightnessLevel ?? brightnessLevel;
    illuminationScore = clientEnvironmental.illuminationScore ?? illuminationScore;
    motionActivity = clientEnvironmental.motionActivity || motionActivity;
    fanActivity = clientEnvironmental.fanActivity || fanActivity;
    lightingStatus = clientEnvironmental.lightingStatus || lightingStatus;
    lightingCondition = clientEnvironmental.lightingCondition || lightingCondition;
  } else {
    // 2. Otherwise, fall back to simulated intelligence based on device states and occupancy
    const lightsOn = deviceStates.lights === true;
    const fanOn = deviceStates.fan === true;

    // Simulate Brightness & Lighting based on device telemetry
    if (lightsOn) {
      // Light is ON: Bright Room
      const randomOffset = Math.floor(Math.random() * 8); // 85% - 92%
      brightnessLevel = 85 + randomOffset;
      illuminationScore = brightnessLevel;
      lightingStatus = "Likely ON";
      lightingCondition = "Bright Room Detected";
    } else {
      // Light is OFF: Dark Room
      const randomOffset = Math.floor(Math.random() * 5); // 8% - 12%
      brightnessLevel = 8 + randomOffset;
      illuminationScore = brightnessLevel;
      lightingStatus = "Likely OFF";
      lightingCondition = "Dark Room Detected";
    }

    // Simulate Fan Activity
    if (fanOn) {
      fanActivity = "Detected";
    } else {
      fanActivity = "Not Detected";
    }

    // Simulate Motion Activity
    if (peopleCount > 0) {
      // People are present: motion varies
      const sec = new Date().getSeconds();
      motionActivity = sec % 2 === 0 ? "Medium" : "Low";
    } else {
      // Empty room
      motionActivity = "None";
    }
  }

  // 3. Room State Engine Combinations
  const isBright = brightnessLevel >= 40;
  let roomState = "Empty + Dark";

  if (occupancy === "Occupied") {
    roomState = isBright ? "Occupied + Bright" : "Occupied + Dark";
  } else {
    roomState = isBright ? "Empty + Bright" : "Empty + Dark";
  }

  // 4. Energy Agent Rules
  let energyEfficiencyState = "Normal Operation";

  // Rule 1: Occupancy = Empty AND Brightness > Threshold (30%) -> Potential Waste
  if (occupancy === "Empty" && brightnessLevel > 30) {
    energyEfficiencyState = "Potential Waste";
  }
  // Rule 2: Occupancy = Occupied AND Brightness Very Low (< 15%) -> Insufficient Lighting
  else if (occupancy === "Occupied" && brightnessLevel < 15) {
    energyEfficiencyState = "Insufficient Lighting";
  }
  // Rule 3: Occupancy = Occupied AND Brightness Appropriate -> Normal Operation
  else if (occupancy === "Occupied" && brightnessLevel >= 15) {
    energyEfficiencyState = "Normal Operation";
  }

  return {
    brightnessLevel,
    illuminationScore,
    motionActivity,
    fanActivity,
    lightingStatus,
    lightingCondition,
    roomState,
    energyEfficiencyState
  };
};

module.exports = {
  analyzeFrame
};
