const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is missing");
}

if (!dbName) {
  throw new Error(
    "MONGODB_DB_NAME environment variable is missing"
  );
}

const client = new MongoClient(uri);

let database = null;
let connectionPromise = null;

// =====================================
// Connect Database
// =====================================

const connectDB = async () => {
  // Already connected
  if (database) {
    return database;
  }

  // Connection already in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = client
    .connect()
    .then(() => {
      database = client.db(dbName);

      console.log(
        "MongoDB connected successfully"
      );

      return database;
    })
    .catch((error) => {
      connectionPromise = null;

      console.error(
        "MongoDB connection failed:",
        error
      );

      throw error;
    });

  return connectionPromise;
};

// =====================================
// Get Database
// =====================================

const getDB = () => {
  if (!database) {
    throw new Error(
      "Database is not connected"
    );
  }

  return database;
};

module.exports = {
  connectDB,
  getDB,
};