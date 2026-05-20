import { getRedisClient } from '../config/redis';

// Intentionally loose — the real shape lives in packages/game-logic
export type GameState = Record<string, unknown>;

const gameKey = (roomCode: string): string => `game:${roomCode.toUpperCase()}`;
const TTL_24H = 60 * 60 * 24;

export async function getGameState(roomCode: string): Promise<GameState | null> {
  const raw = await getRedisClient().get(gameKey(roomCode));
  return raw ? (JSON.parse(raw) as GameState) : null;
}

export async function setGameState(
  roomCode: string,
  state: GameState
): Promise<void> {
  await getRedisClient().set(gameKey(roomCode), JSON.stringify(state), 'EX', TTL_24H);
}

export async function deleteGameState(roomCode: string): Promise<void> {
  await getRedisClient().del(gameKey(roomCode));
}
