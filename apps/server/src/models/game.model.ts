import { Schema, model, Document } from 'mongoose';

export interface IGamePlayer {
  token: string;
  username: string;
  position: number;
}

export interface IGameHistory {
  roomCode: string;
  players: IGamePlayer[];
  winner: string;
  duration: number;
  cardCount: number;
}

export type IGameHistoryDocument = IGameHistory & Document;

const gamePlayerSchema = new Schema<IGamePlayer>(
  {
    token: { type: String, required: true },
    username: { type: String, required: true },
    position: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const gameHistorySchema = new Schema<IGameHistory>(
  {
    roomCode: { type: String, required: true, index: true },
    players: { type: [gamePlayerSchema], default: [] },
    winner: { type: String, required: true },
    duration: { type: Number, required: true, min: 0 },
    cardCount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const GameHistory = model<IGameHistory>('GameHistory', gameHistorySchema);
