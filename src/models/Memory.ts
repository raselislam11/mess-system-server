import { Schema, models, model, Document } from "mongoose";

interface IMemory extends Document {
  messId: Schema.Types.ObjectId;
  type: "photo" | "video" | "text";
  content: string; // text content for type=text
  url: string; // Cloudinary URL for photo/video
  authorId: Schema.Types.ObjectId;
  createdAt: Date;
}

const memorySchema = new Schema<IMemory>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    type: { type: String, enum: ["photo", "video", "text"], required: true },
    content: { type: String, default: "" },
    url: { type: String, default: "" },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.Memory || model<IMemory>("Memory", memorySchema);
