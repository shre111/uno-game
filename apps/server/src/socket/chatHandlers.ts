import type { IoServer, IoSocket } from './types';

const MAX_MESSAGE_LENGTH = 200;

export function registerChatHandlers(io: IoServer, socket: IoSocket): void {
  socket.on('chat:send', ({ message }) => {
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

    const { username, avatar } = socket.data.guest;

    io.to(roomCode).emit('chat:message', {
      username,
      avatar,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });
  });
}
