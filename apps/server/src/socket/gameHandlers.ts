import { ClassicUNO, FlipUNO, MercyUNO } from '@uno-game/game-logic';
import type { GameState } from '@uno-game/game-logic';
import { Room } from '../models/room.model';
import { GameHistory } from '../models/game.model';
import { getGameState, setGameState, deleteGameState } from '../services/redisService';
import type { IoServer, IoSocket, GameEndPayload } from './types';

const GAME_START_KEY = (code: string) => `gamestart:${code}`;
const REDIS_GAME_TTL = 86_400;

function getEngine(variant?: string) {
  if (variant === 'Flip') return FlipUNO;
  if (variant === 'Mercy') return MercyUNO;
  return ClassicUNO;
}

/**
 * Resolve the player's room. Normally this is `socket.data.currentRoom`, but a
 * mobile socket that reconnected may not have had it restored yet (or the action
 * raced the reconnect handler). Fall back to MongoDB room membership so a genuine
 * in-room player isn't wrongly told "you are not in a room".
 */
async function resolveRoom(socket: IoSocket): Promise<string | null> {
  if (socket.data.currentRoom) return socket.data.currentRoom;
  try {
    const token = socket.data.guest.token;
    const room = await Room.findOne({ 'players.token': token }).exec();
    if (room) {
      socket.data.currentRoom = room.code;
      socket.join(room.code);
      return room.code;
    }
  } catch {
    // ignore — fall through to null
  }
  return null;
}

// ── Turn timeout enforcement ──────────────────────────────────────────────────
// Per-room timers that auto-advance the turn if the active player doesn't act in
// time. Single-process in-memory map (matches the disconnect-timer approach).
const turnTimers = new Map<string, NodeJS.Timeout>();

export function clearTurnTimer(roomCode: string): void {
  const t = turnTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(roomCode);
  }
}

function scheduleTurnTimer(io: IoServer, state: GameState): void {
  clearTurnTimer(state.roomCode);
  const duration = state.turnDuration ?? 0;
  if (state.status !== 'playing' || duration <= 0) return;

  const roomCode = state.roomCode;
  const timer = setTimeout(() => {
    void handleTurnTimeout(io, roomCode);
  }, duration * 1000);
  turnTimers.set(roomCode, timer);
}

async function handleTurnTimeout(io: IoServer, roomCode: string): Promise<void> {
  turnTimers.delete(roomCode);
  try {
    const raw = await getGameState(roomCode);
    if (!raw) return;
    const state = raw as unknown as GameState;
    if (state.status !== 'playing') return;

    const current = state.players[state.currentPlayerIndex];
    if (!current) return;

    const engine = getEngine(state.variant);
    // Penalize inaction with a draw, then guarantee the turn moves on.
    let next = engine.drawCard(state, current.token).state;
    if (next.status === 'playing' && next.currentPlayerIndex === state.currentPlayerIndex) {
      next = engine.forceSkipTurn(next);
    }

    if (next.status === 'finished') {
      await finalizeGame(io, next, roomCode);
      return;
    }
    await saveAndBroadcast(io, next);
  } catch {
    // Non-fatal — a later action will reschedule the timer
  }
}

function emitPersonalizedToAll(io: IoServer, state: GameState): void {
  const engine = getEngine(state.variant);
  for (const player of state.players) {
    io.to(player.token).emit('game:stateUpdate', engine.personalizeState(state, player.token));
  }
}

async function saveAndBroadcast(
  io: IoServer,
  state: GameState,
  event: 'game:started' | 'game:stateUpdate' = 'game:stateUpdate',
): Promise<void> {
  // Stamp the start of this turn so clients can render an accurate countdown
  const stamped: GameState = { ...state, turnStartedAt: Date.now() };
  await setGameState(stamped.roomCode, stamped as unknown as Record<string, unknown>);
  const engine = getEngine(stamped.variant);
  for (const player of stamped.players) {
    io.to(player.token).emit(event, engine.personalizeState(stamped, player.token));
  }
  scheduleTurnTimer(io, stamped);
}

async function finalizeGame(io: IoServer, state: GameState, roomCode: string): Promise<void> {
  clearTurnTimer(roomCode);
  const redis = (await import('../config/redis')).getRedisClient();
  const startRaw = await redis.get(GAME_START_KEY(roomCode));
  const startedAt = startRaw ? parseInt(startRaw, 10) : Date.now();
  const duration = Math.round((Date.now() - startedAt) / 1_000);

  const sortedPlayers = [...state.players].sort((a, b) => a.hand.length - b.hand.length);

  const endPayload: GameEndPayload = {
    roomCode,
    winner: state.winner!,
    players: sortedPlayers.map((p, i) => ({
      token: p.token,
      username: p.username,
      position: i + 1,
      handCount: p.hand.length,
    })),
    duration,
  };

  await GameHistory.create({
    roomCode,
    players: endPayload.players.map(({ token, username, position }) => ({ token, username, position })),
    winner: state.winner!,
    duration,
    cardCount: state.discardPile.length,
  });

  await Room.updateOne({ code: roomCode }, { status: 'finished' });

  const engine = getEngine(state.variant);
  for (const player of state.players) {
    io.to(player.token).emit('game:stateUpdate', engine.personalizeState(state, player.token));
  }
  io.to(roomCode).emit('game:ended', endPayload);

  await deleteGameState(roomCode);
  await redis.del(GAME_START_KEY(roomCode));
}

export function registerGameHandlers(io: IoServer, socket: IoSocket): void {
  const emit = (code: string, message: string) => socket.emit('error', { code, message });

  // ── game:start ─────────────────────────────────────────────────────────────
  socket.on('game:start', async (data) => {
    try {
      const roomCode = await resolveRoom(socket);
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const room = await Room.findOne({ code: roomCode }).exec();
      if (!room) return emit('ROOM_NOT_FOUND', 'Room not found');
      if (room.host !== socket.data.guest.token) return emit('NOT_HOST', 'Only the host can start the game');
      if (room.status === 'finished') {
        room.status = 'waiting';
        await room.save();
      }
      if (room.status !== 'waiting') return emit('GAME_ALREADY_STARTED', 'Game has already started');
      if (room.players.length < 2) return emit('NOT_ENOUGH_PLAYERS', 'Need at least 2 players');

      const initPlayers = room.players.map((p) => ({
        token: p.token,
        username: p.username,
        avatar: p.avatar,
      }));

      const engine = getEngine(room.variant);
      const gameState = engine.createInitialState(initPlayers, roomCode);
      gameState.turnDuration = room.settings?.turnDuration ?? 30;
      gameState.houseRules = {
        stackDraw: data?.houseRules?.stackDraw ?? false,
        drawToPlay: data?.houseRules?.drawToPlay ?? false,
      };

      room.status = 'playing';
      await room.save();

      const redis = (await import('../config/redis')).getRedisClient();
      await redis.set(GAME_START_KEY(roomCode), String(Date.now()), 'EX', REDIS_GAME_TTL);

      await saveAndBroadcast(io, gameState, 'game:started');
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to start game');
    }
  });

  // ── game:playCard ──────────────────────────────────────────────────────────
  socket.on('game:playCard', async ({ cardIndex, chosenColor }) => {
    try {
      const roomCode = await resolveRoom(socket);
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const engine = getEngine(state.variant);
      const { state: newState, error } = engine.playCard(state, socket.data.guest.token, cardIndex, chosenColor);

      if (error) return emit(error, `Cannot play card: ${error}`);

      if (newState.status === 'finished') {
        await finalizeGame(io, newState, roomCode);
        return;
      }

      await saveAndBroadcast(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to play card');
    }
  });

  // ── game:drawCard ──────────────────────────────────────────────────────────
  socket.on('game:drawCard', async () => {
    try {
      const roomCode = await resolveRoom(socket);
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const engine = getEngine(state.variant);
      const result = engine.drawCard(state, socket.data.guest.token);
      const { state: newState, drawnCards } = result;

      // Mercy: player tried to draw when they already have a playable card
      if (state.variant === 'Mercy' && 'noAction' in result && result.noAction) {
        return emit('HAS_PLAYABLE_CARD', 'You have a playable card — play it');
      }

      if (drawnCards.length === 0) return emit('NOT_YOUR_TURN', 'It is not your turn');

      if (newState.status === 'finished') {
        await finalizeGame(io, newState, roomCode);
        return;
      }

      await saveAndBroadcast(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to draw card');
    }
  });

  // ── game:callUNO ───────────────────────────────────────────────────────────
  socket.on('game:callUNO', async () => {
    try {
      const roomCode = await resolveRoom(socket);
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const player = state.players.find((p) => p.token === socket.data.guest.token);
      if (!player) return emit('PLAYER_NOT_FOUND', 'Player not found in game');

      const engine = getEngine(state.variant);

      // False-call penalty — calling UNO with more (or fewer) than 1 card costs 2 cards.
      // Idempotent: if you already legitimately called UNO, calling again is a no-op.
      if (player.hand.length !== 1) {
        const penalized = engine.penalizeFalseUno(state, socket.data.guest.token, 2);
        await setGameState(roomCode, penalized as unknown as Record<string, unknown>);
        emitPersonalizedToAll(io, penalized);
        return emit('FALSE_UNO', 'False UNO call — +2 cards!');
      }

      const newState = engine.callUNO(state, socket.data.guest.token);
      await setGameState(roomCode, newState as unknown as Record<string, unknown>);

      io.to(roomCode).emit('game:unoCall', { playerToken: socket.data.guest.token, username: player.username });
      emitPersonalizedToAll(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to call UNO');
    }
  });

  // ── game:challengeUNO ──────────────────────────────────────────────────────
  socket.on('game:challengeUNO', async (data) => {
    try {
      const roomCode = await resolveRoom(socket);
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const engine = getEngine(state.variant);
      const { state: newState, penalizedToken } = engine.challengeUNO(state, socket.data.guest.token, data?.targetToken);
      const successful = penalizedToken !== socket.data.guest.token;

      io.to(roomCode).emit('game:challenged', {
        challengerToken: socket.data.guest.token,
        penalizedToken,
        successful,
      });
      await saveAndBroadcast(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to challenge UNO');
    }
  });
}
