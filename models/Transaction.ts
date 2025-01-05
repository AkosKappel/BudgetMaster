import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITransaction extends Document {
  ownerId: Types.ObjectId;
  title: string;
  date: Date;
  isExpense: boolean;
  amount: number;
  description: string;
  category: string;
  labels: string[];
  sender: string;
  receiver: string;
}

const TransactionSchema = new Schema<ITransaction>({
  ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  title: { type: String, required: true },
  date: { type: Date, required: true, default: Date.now },
  isExpense: { type: Boolean, required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '', trim: true },
  category: { type: String, required: true, trim: true, uppercase: true },
  labels: { type: [String], default: [], trim: true, capitalize: true },
  sender: { type: String },
  receiver: { type: String },
});

const Transaction =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
