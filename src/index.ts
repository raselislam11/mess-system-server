import mongoose from "mongoose";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

// Run locally with ts-node-dev; on Vercel the exported `app` is used directly
async function main() {
  try {
    await connectDB();
    console.log("MongoDB সংযোগ সফল হয়েছে।");
  } catch (err) {
    console.error("MongoDB সংযোগ ব্যর্থ হয়েছে।", err);
  }

  app.listen(env.port, () => {
    console.log(`সার্ভার চালু: http://localhost:${env.port}`);
  });
}

void main();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

export { mongoose };
