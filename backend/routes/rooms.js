const express = require("express");
const router = express.Router();
const ESM = require("../services/environmentState.service");

/**
 * GET /api/rooms
 * Returns the current ESM state of all registered rooms/nodes.
 */
router.get("/", async (req, res) => {
    try {
        const rooms = await ESM.getAllRooms();
        res.json({ success: true, count: rooms.length, rooms });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/rooms/:roomId
 * Returns the current ESM state of a specific room.
 */
router.get("/:roomId", async (req, res) => {
    try {
        const room = await ESM.getRoom(req.params.roomId);
        if (!room) {
            return res.status(404).json({ error: `Room ${req.params.roomId} not found.` });
        }
        res.json({ success: true, room });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/rooms/:roomId
 * Removes a room from the ESM registry.
 */
router.delete("/:roomId", async (req, res) => {
    try {
        const deleted = await ESM.deleteRoom(req.params.roomId);
        if (!deleted) {
            return res.status(404).json({ error: `Room ${req.params.roomId} not found.` });
        }
        res.json({ success: true, message: `Room ${req.params.roomId} deleted.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
