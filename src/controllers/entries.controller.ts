import { z } from "zod";
import { Request, Response } from "express";
import DailyEntry from "../models/DailyEntry";
import BazarEntry from "../models/BazarEntry";
import ExtraEntry from "../models/ExtraEntry";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import {
  findMonthForUser,
  requireOpenMonth,
} from "./months.controller";

const threeNumbers = z
  .array(z.number().min(0))
  .length(3, "৩টি মানই দিতে হবে");

const dailyEntrySchema = z.object({
  memberId: z.string().optional(),
  day: z.number().int().min(1).max(30),
  takaGiven: z.number().min(0).default(0),
  takaNote: z.string().trim().max(200).optional(),
  mealTaka: threeNumbers.default([0, 0, 0]),
  chalGiven: z.number().min(0).default(0),
  chalUsed: threeNumbers.default([0, 0, 0]),
});

const bazarSchema = z.object({
  day: z.number().int().min(1).max(30),
  amount: z.number().min(1, "টাকার পরিমাণ দিন"),
  note: z.string().trim().max(200).default(""),
});

const extraSchema = z.object({
  type: z.enum(["taka", "chal"]),
  day: z.number().int().min(1).max(30),
  description: z.string().trim().min(1, "বিবরণ দিন").max(200),
  amount: z.number().min(1, "পরিমাণ দিন"),
});

function memberScope(req: Request) {
  // মেম্বার শুধু নিজের এন্ট্রি দেখতে পারে
  if (req.user!.role === "member") return req.user!.userId;
  const { memberId } = req.query;
  return typeof memberId === "string" && memberId !== "" ? memberId : undefined;
}

export const getDailyEntries = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await findMonthForUser(req.user!.messId, req.params.id);

    const query: Record<string, unknown> = { monthId: month._id };
    const memberId = memberScope(req);
    if (memberId) query.memberId = memberId;
    if (req.query.day) query.day = Number(req.query.day);

    const entries = await DailyEntry.find(query).sort({ day: 1 }).lean();

    res.json({
      entries: entries.map((e) => ({
        id: String(e._id),
        memberId: String(e.memberId),
        day: e.day,
        takaGiven: e.takaGiven,
        takaNote: e.takaNote ?? "",
        mealTaka: e.mealTaka,
        chalGiven: e.chalGiven,
        chalUsed: e.chalUsed,
      })),
    });
  }
);

export const upsertDailyEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const data = dailyEntrySchema.parse(req.body);
    const month = await requireOpenMonth(req.user!.messId, req.params.id);

    // মেম্বার নিজের এন্ট্রিই লিখতে পারে, অন্যেরটা লিখতে ম্যানেজার/কন্ট্রোলার লাগবে
    let memberId = req.user!.userId;
    if (data.memberId && data.memberId !== req.user!.userId) {
      if (req.user!.role === "member") {
        throw new ApiError(403, "অন্য মেম্বারের এন্ট্রি লেখার অনুমতি নেই।");
      }
      memberId = data.memberId;
    }

    const entry = await DailyEntry.findOneAndUpdate(
      { monthId: month._id, memberId, day: data.day },
      {
        $set: {
          takaGiven: data.takaGiven,
          mealTaka: data.mealTaka,
          chalGiven: data.chalGiven,
          chalUsed: data.chalUsed,
          // নোট পাঠালে হালনাগাদ হবে, না পাঠালে আগেরটাই থাকবে
          ...(data.takaNote !== undefined ? { takaNote: data.takaNote } : {}),
        },
        $setOnInsert: {
          messId: req.user!.messId,
          monthId: month._id,
          memberId,
          day: data.day,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      entry: {
        id: String(entry!._id),
        memberId: String(entry!.memberId),
        day: entry!.day,
        takaGiven: entry!.takaGiven,
        takaNote: entry!.takaNote ?? "",
        mealTaka: entry!.mealTaka,
        chalGiven: entry!.chalGiven,
        chalUsed: entry!.chalUsed,
      },
    });
  }
);

export const deleteDailyEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await requireOpenMonth(req.user!.messId, req.params.id);

    const query: Record<string, unknown> = {
      _id: req.params.entryId,
      monthId: month._id,
    };
    // মেম্বার শুধু নিজের এন্ট্রি ডিলিট করতে পারে
    if (req.user!.role === "member") query.memberId = req.user!.userId;

    const entry = await DailyEntry.findOneAndDelete(query);
    if (!entry) {
      throw new ApiError(404, "এন্ট্রিটি খুঁজে পাওয়া যায়নি।");
    }

    res.json({ message: "এন্ট্রিটি মুছে ফেলা হয়েছে।" });
  }
);

export const getBazarEntries = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await findMonthForUser(req.user!.messId, req.params.id);
    const entries = await BazarEntry.find({ monthId: month._id })
      .sort({ day: 1, createdAt: 1 })
      .lean();

    res.json({
      entries: entries.map((e) => ({
        id: String(e._id),
        day: e.day,
        amount: e.amount,
        note: e.note,
      })),
    });
  }
);

export const addBazarEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const data = bazarSchema.parse(req.body);
    const month = await requireOpenMonth(req.user!.messId, req.params.id);

    const entry = await BazarEntry.create({
      ...data,
      messId: req.user!.messId,
      monthId: month._id,
    });

    res.status(201).json({
      entry: {
        id: String(entry._id),
        day: entry.day,
        amount: entry.amount,
        note: entry.note,
      },
    });
  }
);

export const deleteBazarEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await requireOpenMonth(req.user!.messId, req.params.id);
    const entry = await BazarEntry.findOneAndDelete({
      _id: req.params.entryId,
      monthId: month._id,
    });
    if (!entry) {
      throw new ApiError(404, "বাজারের এন্ট্রিটি খুঁজে পাওয়া যায়নি।");
    }
    res.json({ message: "বাজারের এন্ট্রিটি মুছে ফেলা হয়েছে।" });
  }
);

export const getExtraEntries = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await findMonthForUser(req.user!.messId, req.params.id);
    const entries = await ExtraEntry.find({ monthId: month._id })
      .sort({ day: 1, createdAt: 1 })
      .lean();

    res.json({
      entries: entries.map((e) => ({
        id: String(e._id),
        type: e.type,
        day: e.day,
        description: e.description,
        amount: e.amount,
      })),
    });
  }
);

export const addExtraEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const data = extraSchema.parse(req.body);
    const month = await requireOpenMonth(req.user!.messId, req.params.id);

    const entry = await ExtraEntry.create({
      ...data,
      messId: req.user!.messId,
      monthId: month._id,
    });

    res.status(201).json({
      entry: {
        id: String(entry._id),
        type: entry.type,
        day: entry.day,
        description: entry.description,
        amount: entry.amount,
      },
    });
  }
);

export const deleteExtraEntry = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await requireOpenMonth(req.user!.messId, req.params.id);
    const entry = await ExtraEntry.findOneAndDelete({
      _id: req.params.entryId,
      monthId: month._id,
    });
    if (!entry) {
      throw new ApiError(404, "এন্ট্রিটি খুঁজে পাওয়া যায়নি।");
    }
    res.json({ message: "এন্ট্রিটি মুছে ফেলা হয়েছে।" });
  }
);
