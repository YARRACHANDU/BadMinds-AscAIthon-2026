const express = require("express");
const router = express.Router();
const { perceiveFrame, actuateDevice } = require("../controllers/perceptionController");

// Define routing paths
router.post("/perceive", perceiveFrame);
router.post("/actuate", actuateDevice);

module.exports = router;
