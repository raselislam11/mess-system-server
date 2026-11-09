import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

// Turns every error into a consistent JSON response with a Bangla message
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof ZodError) {
    const banglaDetails: Record<string, string> = {
      required_error: "এই ঘরটি পূরণ করুন",
      invalid_string: "মানটি সঠিক নয়",
      too_small: "মানটি খুব ছোট",
      too_big: "মানটি খুব বড়",
    };
    const first = err.issues[0]?.message || "তথ্য সঠিক নয়";
    return res.status(400).json({ message: first, details: banglaDetails });
  }
  const mongoErr = err as { code?: number; name?: string; message?: string };
  // Duplicate key (e.g. someone already created an account with this email)
  if (mongoErr?.code === 11000) {
    return res
      .status(409)
      .json({ message: "এই ইমেইলটি আগে থেকেই ব্যবহৃত হচ্ছে।" });
  }
  if (mongoErr?.name === "ValidationError" && "errors" in (mongoErr as object)) {
    return res.status(400).json({ message: "তথ্যগুলো সঠিক নয়।" });
  }
  console.error(err);
  return res.status(500).json({ message: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।" });
}
