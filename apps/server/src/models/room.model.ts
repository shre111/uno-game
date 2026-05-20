import { Schema, model, Document } from 'mongoose';

export interface IPlayer {
  token: string;
  username: string;
  avatar: string;
  isHost: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface IRoomSettings {
  maxPlayers: number;
  private: boolean;
}

export interface IRoom {
  code: string;
  host: string;
  status: RoomStatus;
  players: IPlayer[];
  maxPlayers: number;
  direction: 1 | -1;
  currentTurn: number;
  settings: IRoomSettings;
}

export type IRoomDocument = IRoom & Document;

const playerSchema = new Schema<IPlayer>(
  {
    token: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String, required: true },
    isHost: { type: Boolean, default: false },
  },
  { _id: false }
);

const roomSchema = new Schema<IRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    host: { type: String, required: true },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'] as RoomStatus[],
      default: 'waiting',
    },
    players: { type: [playerSchema], default: [] },
    maxPlayers: { type: Number, default: 4, min: 2, max: 10 },
    direction: { type: Number, enum: [1, -1], default: 1 },
    currentTurn: { type: Number, default: 0 },
    settings: {
      maxPlayers: { type: Number, default: 4, min: 2, max: 10 },
      private: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Room = model<IRoom>('Room', roomSchema);
