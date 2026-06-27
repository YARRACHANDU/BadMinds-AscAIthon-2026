const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const perceptionRoutes = require("./routes/perception");
const roomsRoutes = require("./routes/rooms");

dotenv.config();

const PORT = process.env.PORT || 2005;
const app = express();

// Middleware config
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routing mounts
app.use("/api", perceptionRoutes);
app.use("/api/rooms", roomsRoutes);

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});