import { Schema, models, model, Document } from "mongoose";

interface IExtraEntry extends Document {
  messId: Schema.Types.ObjectId;
  monthId: Schema.Types.ObjectId;
  type: "taka" | "chal";
  day: number; // 1-30
  description: string;
  amount: number; // money for taka, quantity for chal
  createdAt: Date;
}

const extraEntrySchema = new Schema<IExtraEntry>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    type: { type: String, enum: ["taka", "chal"], required: true },
    day: { type: Number, min: 1, max: 30, required: true },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, min: 0, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.ExtraEntry || model<IExtraEntry>("ExtraEntry", extraEntrySchema);
