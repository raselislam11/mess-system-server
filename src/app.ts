import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { env } from "./config/env";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Simple health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// রুটে কেউ গেলে সহজ উত্তর (Vercel-এ সার্ভার বাঁচা আছে কি না বোঝার জন্য)
app.get("/", (_req, res) =>
  res.json({ ok: true, message: "মেস ম্যানেজার API চলছে। /api দেখুন।" })
);

app.use("/api", routes);

// অজানা API রুটের ফলব্যাক
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "এই লিংকটি খুঁজে পাওয়া যায়নি।" });
});

app.use(errorHandler);

export default app;
