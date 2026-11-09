import bcrypt from "bcryptjs";
import { z } from "zod";
import { Request, Response } from "express";
import User from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { Role } from "../utils/types";

const addMemberSchema = z.object({
  name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষর হতে হবে").max(100),
  email: z.string().trim().email("সঠিক ইমেইল দিন").toLowerCase(),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
});

const updateMemberSchema = z.object({
  role: z.enum(["controller", "manager", "member"]).optional(),
  isActive: z.boolean().optional(),
});

function toMemberJson(u: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role as Role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await User.find({ messId: req.user!.messId })
    .select("name email role isActive createdAt")
    .sort({ createdAt: 1 });

  res.json({ members: members.map(toMemberJson) });
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = addMemberSchema.parse(req.body);

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "এই ইমেইলটি দিয়ে অ্যাকাউন্ট আগেই তৈরি করা হয়েছে।");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const member = await User.create({
    messId: req.user!.messId,
    name,
    email,
    passwordHash,
    role: "member",
  });

  res.status(201).json({
    member: toMemberJson({
      _id: member._id,
      name: member.name,
      email: member.email,
      role: member.role,
      isActive: member.isActive,
      createdAt: member.createdAt,
    }),
  });
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const { role, isActive } = updateMemberSchema.parse(req.body);

  const target = await User.findOne({
    _id: req.params.id,
    messId: req.user!.messId,
  });
  if (!target) {
    throw new ApiError(404, "এই মেম্বারকে খুঁজে পাওয়া যায়নি।");
  }

  // মেসে টার্গেট ছাড়া আর কোনো সক্রিয় কন্ট্রোলার আছে কিনা
  const otherActiveController = await User.exists({
    messId: req.user!.messId,
    role: "controller",
    isActive: true,
    _id: { $ne: target._id },
  });

  // রোল/অ্যাকাউন্ট বদল শুধু কন্ট্রোলার পারে; তবে কন্ট্রোলারের আসন খালি
  // থাকলে ম্যানেজারও নতুন কন্ট্রোলার/ম্যানেজার সেট করতে পারবে
  if (req.user!.role !== "controller" && otherActiveController) {
    throw new ApiError(403, "রোল বদলানোর অনুমতি শুধু কন্ট্রোলারের।");
  }

  // কন্ট্রোলার নিজেকে নিজে বন্ধ করতে পারবে না
  if (String(target._id) === req.user!.userId && isActive === false) {
    throw new ApiError(400, "আপনি নিজেকে বাদ দিতে পারবেন না।");
  }

  // অন্য কন্ট্রোলারের অ্যাকাউন্ট বন্ধ করা যাবে না
  if (
    isActive !== undefined &&
    target.role === "controller" &&
    String(target._id) !== req.user!.userId
  ) {
    throw new ApiError(403, "কন্ট্রোলারকে বাদ দেওয়া যায় না।");
  }

  if (role !== undefined && role !== target.role) {
    // নিজের রোল নিজে বদলানো যাবে না — মেসে সবসময় একজন কন্ট্রোলার থাকতে হবে
    if (String(target._id) === req.user!.userId) {
      throw new ApiError(400, "নিজের রোল বদলানো যাবে না।");
    }

    // নতুন কন্ট্রোলার সেট করলে পুরোনো কন্ট্রোলার সাধারণ সদস্য হবে —
    // মেসে একবারে একজনই কন্ট্রোলার থাকবে
    if (role === "controller" && otherActiveController) {
      await User.updateMany(
        {
          messId: req.user!.messId,
          role: "controller",
          isActive: true,
          _id: { $ne: target._id },
        },
        { role: "member" }
      );
    }

    // মেসে একবারে একজনই ম্যানেজার থাকবে — আগের ম্যানেজার সাধারণ সদস্য হবে
    if (role === "manager") {
      await User.updateMany(
        {
          messId: req.user!.messId,
          role: "manager",
          isActive: true,
          _id: { $ne: target._id },
        },
        { role: "member" }
      );
    }

    target.role = role;
  }

  if (isActive !== undefined) {
    target.isActive = isActive;
  }

  await target.save();

  res.json({
    member: toMemberJson({
      _id: target._id,
      name: target.name,
      email: target.email,
      role: target.role,
      isActive: target.isActive,
      createdAt: target.createdAt,
    }),
  });
});
