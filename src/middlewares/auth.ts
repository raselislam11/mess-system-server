import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { Role } from "../utils/types";

export type SessionUser = {
  userId: string;
  messId: string;
  role: Role;
};

// Merge our JWT payload into the Express Request type
declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

export function signToken(payload: SessionUser): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: `${env.jwtExpiresInDays}d`,
  });
}

export function verifyToken(token: string): SessionUser {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as Partial<SessionUser> &
      SessionUser;
    if (!payload.userId || !payload.messId) {
      throw new Error("payload");
    }
    return { userId: payload.userId, messId: payload.messId, role: payload.role };
  } catch {
    throw new ApiError(401, "সেশন শেষ হয়ে গেছে। আবার লগইন করুন।");
  }
}

export function auth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) return next(new ApiError(401, "অনুগ্রহ করে আগে লগইন করুন।"));
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}
