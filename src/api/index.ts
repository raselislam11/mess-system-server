import app from "../app";
import { connectDB } from "../config/db";

// সার্ভারলেস কোল্ড স্টার্টে ডেটাবেস জোড়া হয়
// (mongoose সংযোগ না হওয়া পর্যন্ত কোয়েরি বাফার করে রাখে)
connectDB().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("MongoDB সংযোগ ব্যর্থ হয়েছে:", msg);
});

// @vercel/node Express অ্যাপকে সরাসরি হ্যান্ডলার হিসেবে চালায়
export default app;
