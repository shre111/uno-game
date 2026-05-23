import { Room } from '../models/room.model';
import type { IoServer, IoSocket } from './types';

const MAX_MESSAGE_LENGTH = 200;

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
}
