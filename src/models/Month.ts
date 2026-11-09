import { Schema, models, model, Document } from "mongoose";

interface IMonth extends Document {
  messId: Schema.Types.ObjectId;
  label: string;
  status: "open" | "closed";
  createdAt: Date;
}

const monthSchema = new Schema<IMonth>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    label: { type: String, required: true, trim: true, maxlength: 50 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// One open month per mess at a time
monthSchema.index({ messId: 1, status: 1 });
monthSchema.index({ messId: 1, label: 1 }, { unique: true });

export default models.Month || model<IMonth>("Month", monthSchema);
