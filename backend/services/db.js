const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI;
    if (!connStr) {
      throw new Error("MONGO_URI not specified in environment configuration.");
    }
    console.log("Connecting to MongoDB URI:", connStr.replace(/:([^@]+)@/, ":*****@"));
    await mongoose.connect(connStr);
    console.log("MongoDB connected successfully to cluster.");
  } catch (error) {
    console.error("Database connection failure:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
