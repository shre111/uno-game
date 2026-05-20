import type { HydratedDocument } from 'mongoose';
import { Room, IRoom, IPlayer } from '../models/room.model';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRoomCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

export interface CreateRoomOptions {
  username: string;
  avatar: string;
  maxPlayers?: number;
  private?: boolean;
}

export async function createRoom(
  hostToken: string,
  options: CreateRoomOptions
): Promise<HydratedDocument<IRoom>> {
  const { username, avatar, maxPlayers = 4, private: isPrivate = false } = options;

  const hostPlayer: IPlayer = {
    token: hostToken,
    username,
    avatar,
    isHost: true,
  };

  const room = new Room({
    code: generateRoomCode(),
    host: hostToken,
    players: [hostPlayer],
    maxPlayers,
    settings: { maxPlayers, private: isPrivate },
  });

  return room.save();
}

export async function getRoomByCode(
  code: string
): Promise<HydratedDocument<IRoom> | null> {
  return Room.findOne({ code: code.toUpperCase() }).exec();
}

export async function addPlayerToRoom(
  code: string,
  player: IPlayer
): Promise<HydratedDocument<IRoom> | null> {
  return Room.findOneAndUpdate(
    { code: code.toUpperCase() },
    { $push: { players: player } },
    { new: true }
  ).exec();
}
