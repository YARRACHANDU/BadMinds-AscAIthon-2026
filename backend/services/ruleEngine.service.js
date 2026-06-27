const fs = require("fs");
const path = require("path");

// Load rules from config/rules.json
const getRules = () => {
  try {
    const filePath = path.join(__dirname, "../config/rules.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load rules.json:", err);
  }
  return [];
};

// Check if current time is outside allowed hours
const isTimeOutsideAllowedHours = (allowedHours) => {
  if (!allowedHours) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  const [startHour, startMin] = allowedHours.start.split(":").map(Number);
  const [endHour, endMin] = allowedHours.end.split(":").map(Number);
  
  const currentTimeVal = currentHour * 60 + currentMin;
  const startTimeVal = startHour * 60 + startMin;
  const endTimeVal = endHour * 60 + endMin;
  
  return currentTimeVal < startTimeVal || currentTimeVal > endTimeVal;
};

/**
 * Evaluate rules for a specific room state and detected objects.
 * @param {Object} room - The room state.
 * @param {Array<string>} detectedObjects - Detections from the current frame.
 * @returns {Array<Object>} List of triggered rules.
 */
const evaluateRules = (room, detectedObjects = []) => {
  const rules = getRules();
  const triggered = [];
  
  const {
    roomName,
    spaceType,
    peopleCount,
    deviceStates = {},
    roomEmptySince,
    occupancyStatusDetailed
  } = room;

  for (const rule of rules) {
    let match = true;
    const conds = rule.conditions;

    // 1. Restricted Space Type condition
    if (conds.restrictedSpaceTypes) {
      const matchesType = conds.restrictedSpaceTypes.some(t => 
        (spaceType && spaceType.toLowerCase().includes(t.toLowerCase())) ||
        (roomName && roomName.toLowerCase().includes(t.toLowerCase()))
      );
      if (!matchesType) match = false;
    }

    // 2. Person Present required condition
    if (conds.personRequired && peopleCount === 0) {
      match = false;
    }

    // 3. Person Absent (Empty) required condition
    if (conds.emptyRequired && peopleCount > 0) {
      match = false;
    }

    // 4. Allowed Hours condition
    if (conds.allowedHours) {
      if (!isTimeOutsideAllowedHours(conds.allowedHours)) {
        match = false;
      }
    }

    // 5. Lights State condition
    if (conds.lightsState) {
      const isLightsOn = deviceStates.lights === true;
      if (conds.lightsState === "OFF" && isLightsOn) match = false;
      if (conds.lightsState === "ON" && !isLightsOn) match = false;
    }

    // 6. Device ON condition (for energy wastage)
    if (conds.anyDeviceOn) {
      const anyActive = conds.anyDeviceOn.some(dev => deviceStates[dev] === true);
      if (!anyActive) match = false;
    }

    // 7. Cooldown condition
    if (conds.cooldownSeconds && roomEmptySince) {
      const emptyDurationSec = Math.round((new Date() - new Date(roomEmptySince)) / 1000);
      if (emptyDurationSec < conds.cooldownSeconds) {
        match = false;
      }
    }

    // 8. Detected Objects condition
    if (conds.detectedObjects) {
      const hasObject = detectedObjects.some(obj => 
        conds.detectedObjects.includes(obj.toLowerCase())
      );
      if (!hasObject) match = false;
    }

    // 9. Minimum People Count condition
    if (conds.minPeopleCount !== undefined) {
      if (peopleCount < conds.minPeopleCount) {
        match = false;
      }
    }

    if (match) {
      triggered.push(rule);
    }
  }

  return triggered;
};

module.exports = {
  evaluateRules,
  isTimeOutsideAllowedHours
};
