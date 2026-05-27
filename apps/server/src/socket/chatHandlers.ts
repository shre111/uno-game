import { Room } from '../models/room.model';
import type { IoServer, IoSocket } from './types';

const MAX_MESSAGE_LENGTH = 200;
const VOICE_MAX_BYTES = 300_000; // ~well under Socket.io's 1MB default; 10s opus is tiny
const VOICE_MIN_INTERVAL_MS = 2_000;

export function registerChatHandlers(io: IoServer, socket: IoSocket): void {
  socket.on('chat:send', async ({ message }) => {
    const roomCode = socket.data.currentRoom;

    if (!roomCode) {
      socket.emit('error', { code: 'NOT_IN_ROOM', message: 'You must be in a room to chat' });
      return;
    }

    if (!message || message.trim().length === 0) {
      socket.emit('error', { code: 'EMPTY_MESSAGE', message: 'Message cannot be empty' });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', {
        code: 'MESSAGE_TOO_LONG',
        message: `Message exceeds the ${MAX_MESSAGE_LENGTH} character limit`,
      });
      return;
    }

    const { token: playerToken } = socket.data.guest;

    // Use the player's chosen room identity, not the raw guest JWT username
    // (which is the auto-generated "Guest1234"). Falls back to the guest values.
    let username = socket.data.guest.username;
    let avatar = socket.data.guest.avatar;
    try {
      const room = await Room.findOne({ code: roomCode }).exec();
      const me = room?.players.find((p) => p.token === playerToken);
      if (me) {
        username = me.username;
        avatar = me.avatar;
      }
    } catch {
      // Non-fatal — fall back to guest identity
    }

    io.to(roomCode).emit('chat:message', {
      playerToken,
      username,
      avatar,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });
  });

  // Ephemeral live reactions — broadcast a floating emoji to everyone in the room
  socket.on('reaction:send', async ({ emoji }) => {
    const roomCode = socket.data.currentRoom;
    if (!roomCode || !emoji) return;
    // Keep it to a short emoji string — never a full message
    const safeEmoji = [...emoji].slice(0, 4).join('');
    if (!safeEmoji) return;

    const { token } = socket.data.guest;
    let username = socket.data.guest.username;
    try {
      const room = await Room.findOne({ code: roomCode }).exec();
      const me = room?.players.find((p) => p.token === token);
      if (me) username = me.username;
    } catch {
      // Non-fatal — fall back to guest username
    }

    io.to(roomCode).emit('reaction:received', { emoji: safeEmoji, token, username });
  });

  // Ephemeral voice notes — relay short recorded clips to the room without
  // storing anything. The audio bytes pass through memory and are forwarded to
  // the other players, then forgotten.
  socket.on('voice:send', async ({ audio, mime }) => {
    const roomCode = socket.data.currentRoom;
    if (!roomCode || !audio) return;

    // Size guard — clips are capped client-side (~10s); reject anything large
    const size = (audio as ArrayBuffer).byteLength ?? 0;
    if (size <= 0 || size > VOICE_MAX_BYTES) return;

    // Rate limit — at most one clip per interval per player
    const now = Date.now();
    if (socket.data.lastVoiceAt && now - socket.data.lastVoiceAt < VOICE_MIN_INTERVAL_MS) return;
    socket.data.lastVoiceAt = now;

    const { token } = socket.data.guest;
    let username = socket.data.guest.username;
    try {
      const room = await Room.findOne({ code: roomCode }).exec();
      const me = room?.players.find((p) => p.token === token);
      if (me) username = me.username;
    } catch {
      // Non-fatal — fall back to guest username
    }

    const safeMime = String(mime || 'audio/webm').slice(0, 40);
    // Broadcast to everyone in the room INCLUDING the sender (they hear their own)
    io.to(roomCode).emit('voice:received', { from: token, username, audio, mime: safeMime });
  });
}
