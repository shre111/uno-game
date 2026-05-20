import { ClassicUNO } from '@uno-game/game-logic';
import type { GameState } from '@uno-game/game-logic';
import { Room } from '../models/room.model';
import { GameHistory } from '../models/game.model';
import { getGameState, setGameState, deleteGameState } from '../services/redisService';
import type { IoServer, IoSocket, GameEndPayload } from './types';

const GAME_START_KEY = (code: string) => `gamestart:${code}`;
const REDIS_GAME_TTL = 86_400;

function emitPersonalizedToAll(io: IoServer, state: GameState): void {
  for (const player of state.players) {
    io.to(player.token).emit(
      'game:stateUpdate',
      ClassicUNO.personalizeState(state, player.token),
    );
  }
}

async function saveAndBroadcast(
  io: IoServer,
  state: GameState,
  event: 'game:started' | 'game:stateUpdate' = 'game:stateUpdate',
): Promise<void> {
  await setGameState(state.roomCode, state as unknown as Record<string, unknown>);
  for (const player of state.players) {
    io.to(player.token).emit(
      event,
      ClassicUNO.personalizeState(state, player.token),
    );
  }
}

async function finalizeGame(
  io: IoServer,
  state: GameState,
  roomCode: string,
): Promise<void> {
  const redis = (await import('../config/redis')).getRedisClient();
  const startRaw = await redis.get(GAME_START_KEY(roomCode));
  const startedAt = startRaw ? parseInt(startRaw, 10) : Date.now();
  const duration = Math.round((Date.now() - startedAt) / 1_000);

  const sortedPlayers = [...state.players].sort(
    (a, b) => a.hand.length - b.hand.length,
  );

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

  // Persist game history
  await GameHistory.create({
    roomCode,
    players: endPayload.players.map(({ token, username, position }) => ({
      token,
      username,
      position,
    })),
    winner: state.winner!,
    duration,
    cardCount: state.discardPile.length,
  });

  // Mark room as finished
  await Room.updateOne({ code: roomCode }, { status: 'finished' });

  // Notify all players — personalised final state first, then game:ended
  for (const player of state.players) {
    io.to(player.token).emit('game:stateUpdate', ClassicUNO.personalizeState(state, player.token));
  }
  io.to(roomCode).emit('game:ended', endPayload);

  await deleteGameState(roomCode);
  await redis.del(GAME_START_KEY(roomCode));
}

export function registerGameHandlers(io: IoServer, socket: IoSocket): void {
  const emit = (code: string, message: string) =>
    socket.emit('error', { code, message });

  // ── game:start ─────────────────────────────────────────────────────────────
  socket.on('game:start', async () => {
    try {
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const room = await Room.findOne({ code: roomCode }).exec();
      if (!room) return emit('ROOM_NOT_FOUND', 'Room not found');
      if (room.host !== socket.data.guest.token) return emit('NOT_HOST', 'Only the host can start the game');
      if (room.status !== 'waiting') return emit('GAME_ALREADY_STARTED', 'Game has already started');
      if (room.players.length < 2) return emit('NOT_ENOUGH_PLAYERS', 'Need at least 2 players');

      const initPlayers = room.players.map((p) => ({
        token: p.token,
        username: p.username,
        avatar: p.avatar,
      }));

      const gameState = ClassicUNO.createInitialState(initPlayers, roomCode);

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
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const { state: newState, error } = ClassicUNO.playCard(
        state,
        socket.data.guest.token,
        cardIndex,
        chosenColor,
      );

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
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const { state: newState, drawnCards } = ClassicUNO.drawCard(
        state,
        socket.data.guest.token,
      );

      if (drawnCards.length === 0) return emit('NOT_YOUR_TURN', 'It is not your turn');

      await saveAndBroadcast(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to draw card');
    }
  });

  // ── game:callUNO ───────────────────────────────────────────────────────────
  socket.on('game:callUNO', async () => {
    try {
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const player = state.players.find((p) => p.token === socket.data.guest.token);
      if (!player) return emit('PLAYER_NOT_FOUND', 'Player not found in game');

      const newState = ClassicUNO.callUNO(state, socket.data.guest.token);
      await setGameState(roomCode, newState as unknown as Record<string, unknown>);

      io.to(roomCode).emit('game:unoCall', {
        playerToken: socket.data.guest.token,
        username: player.username,
      });

      // Also send updated state so hand counts refresh for all players
      emitPersonalizedToAll(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to call UNO');
    }
  });

  // ── game:challengeUNO ──────────────────────────────────────────────────────
  socket.on('game:challengeUNO', async () => {
    try {
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const raw = await getGameState(roomCode);
      if (!raw) return emit('GAME_NOT_STARTED', 'No active game in this room');

      const state = raw as unknown as GameState;
      const { state: newState } = ClassicUNO.challengeUNO(
        state,
        socket.data.guest.token,
      );

      await saveAndBroadcast(io, newState);
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to challenge UNO');
    }
  });
}
