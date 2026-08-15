const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

let database;

const connectDB = async () => {
  try {
    await client.connect();

    database = client.db(process.env.MONGODB_DB_NAME);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
};

module.exports = {
  connectDB,
  getDB,
};