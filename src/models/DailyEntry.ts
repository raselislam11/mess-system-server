import { Schema, models, model, Document } from "mongoose";

interface IDailyEntry extends Document {
  messId: Schema.Types.ObjectId;
  monthId: Schema.Types.ObjectId;
  memberId: Schema.Types.ObjectId;
  day: number; // 1-30
  takaGiven: number;
  takaNote: string;
  mealTaka: [number, number, number];
  chalGiven: number;
  chalUsed: [number, number, number];
  createdAt: Date;
}

const dailyEntrySchema = new Schema<IDailyEntry>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: Number, min: 1, max: 30, required: true },
    takaGiven: { type: Number, min: 0, default: 0 },
    takaNote: { type: String, trim: true, maxlength: 200, default: "" },
    mealTaka: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 3 && v.every((n) => n >= 0),
        message: "mealTaka must have 3 values >= 0",
      },
      default: [0, 0, 0],
    },
    chalGiven: { type: Number, min: 0, default: 0 },
    chalUsed: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 3 && v.every((n) => n >= 0),
        message: "chalUsed must have 3 values >= 0",
      },
      default: [0, 0, 0],
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// One entry per member per day in a month
dailyEntrySchema.index({ monthId: 1, memberId: 1, day: 1 }, { unique: true });

export default models.DailyEntry || model<IDailyEntry>("DailyEntry", dailyEntrySchema);
