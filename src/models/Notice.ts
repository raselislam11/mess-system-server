import { Schema, models, model, Document } from "mongoose";

interface INotice extends Document {
  messId: Schema.Types.ObjectId;
  text: string;
  authorId: Schema.Types.ObjectId;
  createdAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Notice || model<INotice>("Notice", noticeSchema);
