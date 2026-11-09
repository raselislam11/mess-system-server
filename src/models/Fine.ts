import { Schema, models, model, Document } from "mongoose";

interface IFine extends Document {
  messId: Schema.Types.ObjectId;
  personName: string;
  note: string;
  fileUrl: string; // optional upload URL (Cloudinary later)
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
}

const fineSchema = new Schema<IFine>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    personName: { type: String, required: true, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    fileUrl: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Fine || model<IFine>("Fine", fineSchema);
