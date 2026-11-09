import { Schema, models, model, Document } from "mongoose";

interface IMess extends Document {
  name: string;
  createdAt: Date;
}

const messSchema = new Schema<IMess>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Mess || model<IMess>("Mess", messSchema);
