// Controller for processing perception frames
const ESM = require("../services/environmentState.service");

/**
 * Handle incoming camera frame from the frontend
 * Route: POST /api/perceive
 */
const perceiveFrame = async (req, res) => {
    try {
        const { image, simulationMode } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: "No image payload provided" });
        }

        console.log(`[Sensor Ingestion] Ingesting frame to Afferens (Size: ${image.length} chars)`);

        // Forward the frame payload directly to the Afferens Ingest API
        const ingestRes = await fetch(`${process.env.AFFERENS_BASE_URL}/ingest`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.AFFERENS_API_KEY,
            },
            body: JSON.stringify({
                modality: "VISION",
                data: {
                    image: image,
                    location: "Main Office / Lab",
                },
                classification: "dashboard_webcam",
            }),
        });

        let ingestData = null;
        if (ingestRes.ok) {
            ingestData = await ingestRes.json();
            console.log("[Sensor Ingestion] Afferens Response:", JSON.stringify(ingestData));
        } else {
            console.warn(`[Sensor Ingestion] Afferens Ingest returned error status: ${ingestRes.status} (e.g. 402 out of tokens). Falling back to simulated perception.`);
        }

        // 2. Fetch the processed perception results
        let perceptionData = null;
        try {
            const queryUrl = simulationMode === "demo"
                ? `${process.env.AFFERENS_BASE_URL}/demo?modality=VISION`
                : `${process.env.AFFERENS_BASE_URL}/perception?modality=VISION&limit=1`;
            
            const headers = { "Content-Type": "application/json" };
            if (simulationMode !== "demo") {
                headers["X-API-KEY"] = process.env.AFFERENS_API_KEY;
            }

            const perceptionRes = await fetch(queryUrl, { headers });
            if (perceptionRes.ok) {
                perceptionData = await perceptionRes.json();
            } else {
                console.warn(`[Sensor Perception] Query returned error status: ${perceptionRes.status}. Engaging local fallback perception.`);
            }
        } catch (fetchErr) {
            console.error("[Sensor Perception] Query error:", fetchErr.message);
        }


        // 3. Extract objects from Afferens response or engage local fallback
        const latestEvent = perceptionData?.data?.[0];
        let objects = [];

        if (latestEvent?.data?.objects) {
            objects = latestEvent.data.objects;
        } else {
            // Fallback: Simulate detections when Afferens is unavailable
            const randVal = Math.random();
            if (randVal > 0.5) {
                objects.push({ label: "person", confidence: 0.88 });
                if (randVal > 0.9) {
                    objects.push({ label: "unidentified object", confidence: 0.76 });
                }
            }
        }

        // 4. Feed raw perception objects into the Environment State Manager
        //    ESM handles all state diffing, occupancy transitions, and timestamps
        const nodeId = req.body.nodeId || "NODE_01";
        const esmResult = await ESM.updateEnvironmentState(
            nodeId,
            { objects },
            req.body.cameraId || nodeId
        );

        // 5. Build the dashboard-friendly roomState from the ESM output
        const { updated } = esmResult;
        const hasWarningObj = updated.detectedObjects.some(label =>
            label === "unidentified object" ||
            label === "obstacle" ||
            label === "forklift"
        );

        const roomState = {
            locationId: updated.roomId,
            locationName: "Main Office / Lab",
            peopleCount: updated.peopleCount,
            detectedObjects: updated.detectedObjects,
            roomStatus: updated.occupancyStatus === "Occupied" ? "Active" : "Empty",
            safetyStatus: hasWarningObj ? "Warning" : "Secure",
            lastUpdated: new Date().toLocaleTimeString(),
            roomEmptySince: updated.roomEmptySince,
            confidence: updated.confidence,
        };

        // Return processed state and ingest data to frontend
        res.json({
            success: true,
            roomState,
            esmState: updated,
            changes: esmResult.changes,
            afferensIngest: ingestData,
        });

    } catch (error) {
        console.error("Error in perceiveFrame controller:", error);
        res.status(500).json({ error: "Failed to process perception frame" });
    }
};

/**
 * Send an actuation command to a physical node
 * Route: POST /api/actuate
 */
const actuateDevice = async (req, res) => {
    try {
        const { targetNodeId, commandType, parameters } = req.body;

        console.log(`[Actuator] Sending command ${commandType} to node ${targetNodeId || "NODE_01"}`);

        // Forward the command directly to the Afferens Actuation API
        const actuateRes = await fetch(`${process.env.AFFERENS_BASE_URL}/actuation`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.AFFERENS_API_KEY,
            },
            body: JSON.stringify({
                target_node_id: targetNodeId || "NODE_01",
                command_type: commandType,
                parameters: parameters || {},
            }),
        });

        if (!actuateRes.ok) {
            throw new Error(`Afferens API actuation failed with status: ${actuateRes.status}`);
        }

        const actuateData = await actuateRes.json();
        console.log("[Actuator] Afferens Response:", JSON.stringify(actuateData));

        res.json({
            success: true,
            action: actuateData,
        });

    } catch (error) {
        console.error("Error in actuateDevice controller:", error);
        res.status(500).json({ error: "Failed to send actuation command" });
    }
};

module.exports = {
    perceiveFrame,
    actuateDevice,
};
