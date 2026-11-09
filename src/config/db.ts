import mongoose from "mongoose";
import { env } from "./env";
import User from "../models/User";

// পুরোনো ডেটা ঠিক করা: কোনো মেসে একাধিক সক্রিয় কন্ট্রোলার/ম্যানেজার
// থাকলে প্রথমজন (সবচেয়ে আগের) ছাড়া বাকিদের সাধারণ সদস্য বানানো হয়
async function fixDuplicateRoles(): Promise<void> {
  const groups = await User.aggregate<{
    _id: { messId: mongoose.Types.ObjectId; role: string };
    keepId: mongoose.Types.ObjectId;
    ids: mongoose.Types.ObjectId[];
  }>([
    { $match: { isActive: true, role: { $in: ["controller", "manager"] } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: { messId: "$messId", role: "$role" },
        keepId: { $first: "$_id" },
        ids: { $push: "$_id" },
      },
    },
  ]);

  for (const g of groups) {
    const extra = g.ids
      .filter((id) => String(id) !== String(g.keepId))
      .map((id) => id);
    if (extra.length) {
      await User.updateMany(
        { _id: { $in: extra } },
        { $set: { role: "member" } }
      );
    }
  }
}

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  await fixDuplicateRoles();
}
