import bcrypt from "bcryptjs";
import { z } from "zod";
import Mess from "../models/Mess";
import User from "../models/User";
import Month from "../models/Month";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { signToken, SessionUser } from "../middlewares/auth";
import { env } from "../config/env";
import { Response, Request } from "express";

const authCookieName = "token";

function setAuthCookie(res: Response, payload: SessionUser) {
  const token = signToken(payload);
  res.cookie(authCookieName, token, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    // সব জায়গায় secure কুকি (localhost-ও ব্রাউজারের কাছে secure context)
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(authCookieName, { path: "/" });
}

const createMessSchema = z.object({
  messName: z.string().trim().min(2, "মেসের নাম কমপক্ষে ২ অক্ষর হতে হবে").max(100),
  name: z.string().trim().min(2, "আপনার নাম কমপক্ষে ২ অক্ষর হতে হবে").max(100),
  email: z.string().trim().email("সঠিক ইমেইল দিন").toLowerCase(),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
});

const loginSchema = z.object({
  email: z.string().trim().email("সঠিক ইমেইল দিন").toLowerCase(),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export const registerMess = asyncHandler(async (req: Request, res: Response) => {
  const { messName, name, email, password } = createMessSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "এই ইমেইলটি দিয়ে অ্যাকাউন্ট আগেই তৈরি করা হয়েছে।");
  }

  const mess = await Mess.create({ name: messName });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    messId: mess._id,
    name,
    email,
    passwordHash,
    role: "controller",
  });

  // First open month for the new mess
  const now = new Date();
  const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await Month.create({ messId: mess._id, label, status: "open" });

  setAuthCookie(res, {
    userId: String(user._id),
    messId: String(mess._id),
    role: user.role,
  });

  res.status(201).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      messId: mess._id,
      messName: mess.name,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
  }
  if (!user.isActive) {
    throw new ApiError(403, "আপনার অ্যাকাউন্টটি বাতিল করা হয়েছে।");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApiError(401, "ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
  }

  const mess = await Mess.findById(user.messId);

  setAuthCookie(res, {
    userId: String(user._id),
    messId: String(user.messId),
    role: user.role,
  });

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      messId: user.messId,
      messName: mess?.name ?? "",
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: "লগআউট সফল হয়েছে।" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, "অনুগ্রহ করে আবার লগইন করুন।");
  }
  const mess = await Mess.findById(user.messId);

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      messId: user.messId,
      messName: mess?.name ?? "",
    },
  });
});


