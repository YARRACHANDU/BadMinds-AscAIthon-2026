const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./services/db");
const seedDatabase = require("./services/seeder.service");
const perceptionRoutes = require("./routes/perception");
const roomsRoutes = require("./routes/rooms");
const operationsRoutes = require("./routes/operations");

dotenv.config();

const PORT = process.env.PORT || 2005;
const app = express();

// Middleware config
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routing mounts
app.use("/api", perceptionRoutes);
app.use("/api", operationsRoutes);
app.use("/api/rooms", roomsRoutes);

// Start Database & Express Server
const startServer = async () => {
  await connectDB();
  await seedDatabase();
  
  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
  });
};

startServer();