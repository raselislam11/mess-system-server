import { Schema, models, model, Document } from "mongoose";

interface IMemberBill extends Document {
  messId: Schema.Types.ObjectId;
  monthId: Schema.Types.ObjectId;
  memberId: Schema.Types.ObjectId;
  messBillPaid: boolean;
  messBillAmount: number;
  auntyBillPaid: boolean;
  auntyBillAmount: number;
  createdAt: Date;
}

const memberBillSchema = new Schema<IMemberBill>(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messBillPaid: { type: Boolean, default: false },
    messBillAmount: { type: Number, min: 0, default: 0 },
    auntyBillPaid: { type: Boolean, default: false },
    auntyBillAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// One bill row per member per month
memberBillSchema.index({ monthId: 1, memberId: 1 }, { unique: true });

export default models.MemberBill || model<IMemberBill>("MemberBill", memberBillSchema);
