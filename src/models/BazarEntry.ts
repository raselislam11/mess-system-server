import { Schema, models, model, Document } from "mongoose";

interface IBazarEntry extends Document {
  messId: Schema.Types.ObjectId;
  monthId: Schema.Types.ObjectId;
  day: number; // 1-30
  amount: number;
  note: string;
  createdAt: Date;
}

const bazarEntrySchema = new Schema<IBazarEntry>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    day: { type: Number, min: 1, max: 30, required: true },
    amount: { type: Number, min: 0, required: true },
    note: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.BazarEntry || model<IBazarEntry>("BazarEntry", bazarEntrySchema);
