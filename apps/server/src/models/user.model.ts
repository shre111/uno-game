import { Schema, model, Document } from 'mongoose';

export interface IUser {
  token: string;
  username: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
}

export type IUserDocument = IUser & Document;

const userSchema = new Schema<IUser>(
  {
    token: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true },
    avatar: { type: String, required: true },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    gamesWon: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
