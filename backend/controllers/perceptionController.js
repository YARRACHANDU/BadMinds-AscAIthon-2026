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

        if (req.body.objects && Array.isArray(req.body.objects)) {
            objects = req.body.objects;
        } else if (latestEvent?.data?.objects) {
            objects = latestEvent.data.objects;
        }

        // 4. Feed raw perception objects into the Environment State Manager
        //    ESM handles all state diffing, occupancy transitions, and timestamps
        let targetRoomId = req.body.roomId || req.body.nodeId || "ROOM_A";
        if (targetRoomId === "NODE_01") {
            targetRoomId = "ROOM_A";
        }
        
        const esmResult = await ESM.updateEnvironmentState(
            targetRoomId,
            { objects, image, environmental: req.body.environmental },
            req.body.cameraId || targetRoomId
        );

        const { updated } = esmResult;

        // Return processed state and ingest data to frontend
        res.json({
            success: true,
            roomState: updated,
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
