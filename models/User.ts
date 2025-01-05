import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  email: string;
  name: string;
  password: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, email: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
