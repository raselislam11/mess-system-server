import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`এনভায়রনমেন্ট ভেরিয়েবল নেই: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresInDays: Number(process.env.JWT_EXPIRES_IN_DAYS || 7),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  // কুকি সব জায়গায় secure — বন্ধ করতে চাইলে COOKIE_SECURE=false দিন
  cookieSecure: process.env.COOKIE_SECURE !== "false",
  // ডিফল্ট none — ক্লায়েন্ট ও সার্ভার আলাদা ডোমেইনে (Vercel) কুকি কাজ করে;
  // সব একই ডোমেইনে হলে COOKIE_SAMESITE=lax দিলে বেশি নিরাপদ
  cookieSameSite: (process.env.COOKIE_SAMESITE || "none") as
    | "lax"
    | "strict"
    | "none",
  isProd: process.env.NODE_ENV === "production",
};
