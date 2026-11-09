import { Schema, models, model, Document } from "mongoose";
import type { Role } from "../utils/types";

interface IUser extends Document {
  messId: Schema.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["controller", "manager", "member"], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// মেসে একবারে একজনই সক্রিয় কন্ট্রোলার থাকতে পারবে
userSchema.index(
  { messId: 1 },
  {
    name: "one-active-controller",
    unique: true,
    partialFilterExpression: { role: "controller", isActive: true },
  }
);

// মেসে একবারে একজনই সক্রিয় ম্যানেজার থাকতে পারবে
userSchema.index(
  { messId: 1 },
  {
    name: "one-active-manager",
    unique: true,
    partialFilterExpression: { role: "manager", isActive: true },
  }
);

export default models.User || model<IUser>("User", userSchema);
