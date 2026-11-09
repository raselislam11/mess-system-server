import { Request, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { Role } from "../utils/types";

// Restricts a route to one or more roles; must run after auth
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: unknown, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "অনুগ্রহ করে আগে লগইন করুন।"));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "এই কাজটি করার অনুমতি আপনার নেই।"));
    }
    next();
  };
}
