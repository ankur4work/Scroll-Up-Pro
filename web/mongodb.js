import { MongoClient } from "mongodb";

const collectionName = "shopify_sessions"; // Collection to store sessions

let client;

export const connectToMongoDB = async () => {
  if (!client) {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017"; // Update with your connection string
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB for session storage");
  }
  const dbName = process.env.MONGO_DB_NAME || "shopify_sessions"; // Name of your database
  return client.db(dbName).collection(collectionName);
};
