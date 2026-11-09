import { z } from "zod";
import { Request, Response } from "express";
import Month from "../models/Month";
import User from "../models/User";
import DailyEntry from "../models/DailyEntry";
import BazarEntry from "../models/BazarEntry";
import ExtraEntry from "../models/ExtraEntry";
import MemberBill from "../models/MemberBill";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// A month must belong to the logged-in user's mess
export async function findMonthForUser(messId: string, monthId: string) {
  const month = await Month.findOne({ _id: monthId, messId });
  if (!month) {
    throw new ApiError(404, "এই মাসটি খুঁজে পাওয়া যায়নি।");
  }
  return month;
}

export async function requireOpenMonth(messId: string, monthId: string) {
  const month = await findMonthForUser(messId, monthId);
  if (month.status !== "open") {
    throw new ApiError(400, "এই মাসটি বন্ধ হয়ে গেছে, এখন আর হিসাব বদলানো যাবে না।");
  }
  return month;
}

const createMonthSchema = z.object({
  label: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "মাসের ফরম্যাট হবে যেমন 2026-11")
    .max(50),
});

export const listMonths = asyncHandler(async (req: Request, res: Response) => {
  const months = await Month.find({ messId: req.user!.messId })
    .sort({ label: -1 })
    .lean();

  res.json({
    months: months.map((m) => ({
      id: String(m._id),
      label: m.label,
      status: m.status,
    })),
  });
});

export const getCurrentMonth = asyncHandler(
  async (req: Request, res: Response) => {
    const month = await Month.findOne({
      messId: req.user!.messId,
      status: "open",
    }).sort({ createdAt: -1 });

    if (!month) {
      throw new ApiError(404, "কোনো খোলা মাস পাওয়া যায়নি।");
    }

    res.json({
      month: { id: String(month._id), label: month.label, status: month.status },
    });
  }
);

export const createMonth = asyncHandler(async (req: Request, res: Response) => {
  const { label } = createMonthSchema.parse(req.body);

  const existing = await Month.findOne({ messId: req.user!.messId, label });
  if (existing) {
    throw new ApiError(409, "এই মাসটি আগেই তৈরি করা হয়েছে।");
  }

  // নতুন মাস খোলার সাথে সাথে আগের খোলা মাসগুলো বন্ধ হয়ে যাবে
  await Month.updateMany(
    { messId: req.user!.messId, status: "open" },
    { status: "closed" }
  );

  const month = await Month.create({ messId: req.user!.messId, label });

  res.status(201).json({
    month: { id: String(month._id), label: month.label, status: month.status },
  });
});

export const closeMonth = asyncHandler(async (req: Request, res: Response) => {
  const month = await findMonthForUser(req.user!.messId, req.params.id);
  month.status = "closed";
  await month.save();
  res.json({
    month: { id: String(month._id), label: month.label, status: month.status },
  });
});

const billSchema = z.object({
  messBillPaid: z.boolean().optional(),
  messBillAmount: z.number().min(0).optional(),
  auntyBillPaid: z.boolean().optional(),
  auntyBillAmount: z.number().min(0).optional(),
});

export const updateMemberBill = asyncHandler(
  async (req: Request, res: Response) => {
    const data = billSchema.parse(req.body);
    const month = await requireOpenMonth(req.user!.messId, req.params.monthId);

    const member = await User.findOne({
      _id: req.params.memberId,
      messId: req.user!.messId,
    });
    if (!member) {
      throw new ApiError(404, "এই মেম্বারকে খুঁজে পাওয়া যায়নি।");
    }

    const bill = await MemberBill.findOneAndUpdate(
      { monthId: month._id, memberId: member._id },
      {
        $set: data,
        $setOnInsert: {
          messId: req.user!.messId,
          monthId: month._id,
          memberId: member._id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      bill: {
        memberId: String(bill!.memberId),
        messBillPaid: bill!.messBillPaid,
        messBillAmount: bill!.messBillAmount,
        auntyBillPaid: bill!.auntyBillPaid,
        auntyBillAmount: bill!.auntyBillAmount,
      },
    });
  }
);

export const getMonthSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const messId = req.user!.messId;
    const month = await findMonthForUser(messId, req.params.id);

    const [dailyEntries, bazarEntries, extraEntries, bills, members] =
      await Promise.all([
        DailyEntry.find({ monthId: month._id }).lean(),
        BazarEntry.find({ monthId: month._id }).lean(),
        ExtraEntry.find({ monthId: month._id }).lean(),
        MemberBill.find({ monthId: month._id }).lean(),
        User.find({ messId, isActive: true })
          .select("name role")
          .sort({ createdAt: 1 })
          .lean(),
      ]);

    const nameById = new Map(
      members.map((m) => [String(m._id), m.name] as const)
    );

    const totalBazar = bazarEntries.reduce((sum, b) => sum + b.amount, 0);
    const extraTaka = extraEntries
      .filter((e) => e.type === "taka")
      .reduce((sum, e) => sum + e.amount, 0);
    const extraChal = extraEntries
      .filter((e) => e.type === "chal")
      .reduce((sum, e) => sum + e.amount, 0);

    const rowInit = () => ({
      memberId: "",
      name: "",
      role: "member" as string,
      takaGiven: 0,
      mealTakaTotal: 0,
      chalGiven: 0,
      chalUsedTotal: 0,
      messBillPaid: false,
      messBillAmount: 0,
      auntyBillPaid: false,
      auntyBillAmount: 0,
    });

    const rows = new Map<string, ReturnType<typeof rowInit>>();
    for (const m of members) {
      const key = String(m._id);
      rows.set(key, { ...rowInit(), memberId: key, name: m.name, role: m.role });
    }

    for (const entry of dailyEntries) {
      const key = String(entry.memberId);
      let row = rows.get(key);
      if (!row) {
        row = {
          ...rowInit(),
          memberId: key,
          name: nameById.get(key) ?? "পুরোনো মেম্বার",
        };
        rows.set(key, row);
      }
      row.takaGiven += entry.takaGiven;
      row.mealTakaTotal += entry.mealTaka[0] + entry.mealTaka[1] + entry.mealTaka[2];
      row.chalGiven += entry.chalGiven;
      row.chalUsedTotal += entry.chalUsed[0] + entry.chalUsed[1] + entry.chalUsed[2];
    }

    const billByMember = new Map(
      bills.map((b) => [String(b.memberId), b] as const)
    );

    // বাজার খরচ সব সদস্যের মধ্যে সমান ভাগে ভাগ হয়
    const memberCount = Math.max(members.length, 1);
    const suggestedMessShare = Math.round((totalBazar + extraTaka) / memberCount);

    let totalTakaGiven = 0;
    let totalChalGiven = 0;
    let totalChalUsed = 0;

    const result = [...rows.values()].map((row) => {
      const bill = billByMember.get(row.memberId);
      totalTakaGiven += row.takaGiven;
      totalChalGiven += row.chalGiven;
      totalChalUsed += row.chalUsedTotal;

      return {
        ...row,
        messBillAmount: bill?.messBillAmount ?? suggestedMessShare,
        messBillPaid: bill?.messBillPaid ?? false,
        auntyBillAmount: bill?.auntyBillAmount ?? 0,
        auntyBillPaid: bill?.auntyBillPaid ?? false,
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      month: {
        id: String(month._id),
        label: month.label,
        status: month.status,
      },
      totals: {
        bazar: totalBazar,
        extraTaka,
        extraChal,
        chalGiven: totalChalGiven,
        chalUsed: totalChalUsed,
        takaGiven: totalTakaGiven,
        balance: totalTakaGiven + extraTaka - totalBazar,
      },
      suggestedMessShare,
      rows: result,
    });
  }
);
