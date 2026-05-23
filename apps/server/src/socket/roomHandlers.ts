import { Room } from '../models/room.model';
import { generateRoomCode } from '../services/roomService';
import { getGameState, setGameState, deleteGameState, clearSession } from '../services/redisService';
import { clearTurnTimer } from './gameHandlers';
import type { IoServer, IoSocket, RoomPayload } from './types';

/**
 * `socket.data.currentRoom` can be restored from a persisted session even after
 * the player was removed from the room (e.g. they closed the tab and the 30s
 * disconnect timer pruned them). Before blocking create/join, confirm the player
 * is genuinely still in that room; if not, clear the stale state so they can proceed.
 */
async function hasLiveRoom(socket: IoSocket): Promise<boolean> {
  const roomCode = socket.data.currentRoom;
  if (!roomCode) return false;

  const { token } = socket.data.guest;
  const room = await Room.findOne({ code: roomCode }).exec();
  const stillMember = !!room && room.players.some((p) => p.token === token);

  if (!stillMember) {
    socket.leave(roomCode);
    socket.data.currentRoom = undefined;
    await clearSession(token);
  }
  return stillMember;
}

function toRoomPayload(room: InstanceType<typeof Room>): RoomPayload {
  return {
    code: room.code,
    host: room.host,
    status: room.status,
    variant: room.variant ?? 'Classic',
    players: room.players.map((p) => ({
      token: p.token,
      username: p.username,
      avatar: p.avatar,
      isHost: p.isHost,
    })),
    maxPlayers: room.maxPlayers,
    settings: room.settings,
  };
}

export function registerRoomHandlers(io: IoServer, socket: IoSocket): void {
  const emit = (code: string, message: string) =>
    socket.emit('error', { code, message });

  // ── room:create ────────────────────────────────────────────────────────────
  socket.on('room:create', async (data) => {
    try {
      if (await hasLiveRoom(socket)) {
        return emit('ALREADY_IN_ROOM', 'Leave your current room before creating one');
      }

      const { username, avatar, variant = 'Classic', maxPlayers = 4, private: isPrivate = false, turnDuration = 30 } = data;
      const { token } = socket.data.guest;
      const code = generateRoomCode();
      const safeTurnDuration = Math.min(120, Math.max(10, turnDuration));

      const room = await new Room({
        code,
        host: token,
        variant,
        players: [{ token, username, avatar, isHost: true }],
        maxPlayers,
        settings: { maxPlayers, private: isPrivate, turnDuration: safeTurnDuration },
      }).save();

      socket.join(code);
      socket.data.currentRoom = code;

      // Store lightweight room info in Redis for fast lookups
      await setGameState(code, { roomCode: code, status: 'waiting' });

      socket.emit('room:created', toRoomPayload(room));
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to create room');
    }
  });

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on('room:join', async (data) => {
    try {
      if (await hasLiveRoom(socket)) {
        return emit('ALREADY_IN_ROOM', 'Leave your current room first');
      }

      const { code, username, avatar } = data;
      const { token } = socket.data.guest;

      const room = await Room.findOne({ code: code.toUpperCase() }).exec();
      if (!room) return emit('ROOM_NOT_FOUND', `Room ${code} does not exist`);
      if (room.status !== 'waiting') return emit('GAME_IN_PROGRESS', 'Game has already started');
      if (room.players.length >= room.maxPlayers) return emit('ROOM_FULL', 'Room is at capacity');
      if (room.players.some((p) => p.token === token)) {
        return emit('ALREADY_IN_ROOM', 'You are already in this room');
      }

      room.players.push({ token, username, avatar, isHost: false });
      await room.save();

      socket.join(room.code);
      socket.data.currentRoom = room.code;

      io.to(room.code).emit('room:updated', toRoomPayload(room));
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to join room');
    }
  });

  // ── room:leave ─────────────────────────────────────────────────────────────
  socket.on('room:leave', async () => {
    try {
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return emit('NOT_IN_ROOM', 'You are not in a room');

      const { token } = socket.data.guest;

      const room = await Room.findOneAndUpdate(
        { code: roomCode },
        { $pull: { players: { token } } },
        { new: true },
      ).exec();

      socket.leave(roomCode);
      socket.data.currentRoom = undefined;

      if (!room || room.players.length === 0) {
        clearTurnTimer(roomCode);
        await Room.deleteOne({ code: roomCode });
        await deleteGameState(roomCode);
        return;
      }

      // Transfer host to the first remaining player
      if (room.host === token) {
        const newHost = room.players[0]!;
        room.host = newHost.token;
        newHost.isHost = true;
        await room.save();
      }

      // If game was running, remove player from Redis state
      const gameState = await getGameState(roomCode);
      if (gameState && (gameState as Record<string, unknown>).status === 'playing') {
        const gs = gameState as Record<string, unknown>;
        const players = (gs.players as Array<{ token: string }>) ?? [];
        await setGameState(roomCode, {
          ...gs,
          players: players.filter((p) => p.token !== token),
        });
      }

      io.to(roomCode).emit('room:updated', toRoomPayload(room));
    } catch (err) {
      emit('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to leave room');
    }
  });
}
