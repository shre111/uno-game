import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { ClassicUNO, FlipUNO, MercyUNO } from '@uno-game/game-logic';
import type { GameState } from '@uno-game/game-logic';

function getEngine(variant?: string) {
  if (variant === 'Flip') return FlipUNO;
  if (variant === 'Mercy') return MercyUNO;
  return ClassicUNO;
}
import { generateGuestToken, verifyGuestToken } from '../middleware/auth';
import { getRedisClient } from '../config/redis';
import { registerRoomHandlers } from './roomHandlers';
import { registerGameHandlers, clearTurnTimer } from './gameHandlers';
import { registerChatHandlers } from './chatHandlers';
import { Room } from '../models/room.model';
import { deleteGameState } from '../services/redisService';
import { config } from '../config';
import type { IoServer, ClientToServerEvents, ServerToClientEvents, SocketData } from './types';

const RECONNECT_WINDOW_MS = 30_000;
const SESSION_TTL_S = 3_600;
const GAME_TTL_S = 86_400;

// In-memory map of guestToken → pending disconnect timeout
export const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function createSocketServer(httpServer: HttpServer): IoServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    },
  );

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token as string | undefined;

    if (rawToken) {
      try {
        socket.data.guest = verifyGuestToken(rawToken);
        return next();
      } catch {
        // Invalid token — fall through and generate a fresh identity
      }
    }

    const GUEST_AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐧', '🦋', '🐨'];
    const guestNum = String(Math.floor(Math.random() * 9_999)).padStart(4, '0');
    const avatarEmoji = GUEST_AVATARS[parseInt(guestNum) % 8]!;
    const newJwt = generateGuestToken(`Guest${guestNum}`, avatarEmoji);
    socket.data.guest = verifyGuestToken(newJwt);
    socket.data.newToken = newJwt;
    next();
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const { token } = socket.data.guest;

    // Personal room — used to send targeted events to this player
    socket.join(token);

    // Deliver new token if one was generated during auth
    if (socket.data.newToken) {
      const { token: playerToken, username, avatar } = socket.data.guest;
      socket.emit('auth:token', {
        token: playerToken,
        username,
        avatar,
        jwtToken: socket.data.newToken,
      });
      delete socket.data.newToken;
    }

    // Cancel pending disconnect cleanup if this is a reconnect
    const pendingTimer = disconnectTimers.get(token);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      disconnectTimers.delete(token);
    }

    // Restore session from Redis (reconnect scenario)
    try {
      const redis = getRedisClient();
      const sessionRaw = await redis.get(`session:${token}`);
      if (sessionRaw) {
        const { roomCode } = JSON.parse(sessionRaw) as { roomCode: string };
        // Room membership (MongoDB) is the source of truth for "in a room". This
        // covers the LOBBY too (before any game state exists in Redis). Mobile
        // browsers drop the socket frequently; if we only restored when a game
        // state existed, a reconnect during the lobby would lose currentRoom and
        // later plays would fail with "you are not in a room".
        const room = await Room.findOne({ code: roomCode }).exec();
        const inRoom = !!room && room.players.some((p) => p.token === token);

        if (inRoom) {
          socket.data.currentRoom = roomCode;
          socket.join(roomCode);

          // If a game is in progress, mark this player reconnected and resend state
          const stateRaw = await redis.get(`game:${roomCode}`);
          if (stateRaw) {
            const gameState = JSON.parse(stateRaw) as GameState;
            if (gameState.players.some((p) => p.token === token)) {
              const updated: GameState = {
                ...gameState,
                players: gameState.players.map((p) =>
                  p.token === token ? { ...p, isConnected: true } : p,
                ),
              };
              await redis.set(`game:${roomCode}`, JSON.stringify(updated), 'EX', GAME_TTL_S);
              const engine = getEngine(updated.variant);
              io.to(token).emit('game:stateUpdate', engine.personalizeState(updated, token));
            }
          }
        } else {
          // Stale session — player no longer in that room; drop it
          await redis.del(`session:${token}`);
        }
      }
    } catch {
      // Non-fatal — session data unavailable or Redis error
    }

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);

    // ── Disconnect handler ──────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const roomCode = socket.data.currentRoom;
      if (!roomCode) return;

      try {
        const redis = getRedisClient();

        // Mark player as disconnected in live game state
        const stateRaw = await redis.get(`game:${roomCode}`);
        if (stateRaw) {
          const gameState = JSON.parse(stateRaw) as GameState;
          const updated: GameState = {
            ...gameState,
            players: gameState.players.map((p) =>
              p.token === token ? { ...p, isConnected: false } : p,
            ),
          };
          await redis.set(`game:${roomCode}`, JSON.stringify(updated), 'EX', GAME_TTL_S);
        }

        // Persist session for reconnect window
        await redis.set(
          `session:${token}`,
          JSON.stringify({ roomCode }),
          'EX',
          SESSION_TTL_S,
        );
      } catch {
        // Non-fatal
      }

      // After 30 s with no reconnect, permanently remove the player from the room
      const timer = setTimeout(async () => {
        disconnectTimers.delete(token);
        try {
          const room = await Room.findOneAndUpdate(
            { code: roomCode },
            { $pull: { players: { token } } },
            { new: true },
          ).exec();

          if (!room) return;

          // Transfer host if the departing player was the host
          if (room.host === token && room.players.length > 0) {
            const newHost = room.players[0]!;
            room.host = newHost.token;
            newHost.isHost = true;
            await room.save();
          }

          if (room.players.length === 0) {
            clearTurnTimer(roomCode);
            await Room.deleteOne({ code: roomCode });
            await deleteGameState(roomCode);
            return;
          }

          io.to(roomCode).emit('room:updated', {
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
          });
        } catch {
          // Non-fatal — room may have already been cleaned up
        }
      }, RECONNECT_WINDOW_MS);

      disconnectTimers.set(token, timer);
    });
  });

  return io;
}
