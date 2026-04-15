'use client';

import { io, type Socket } from 'socket.io-client';

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (cb) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('cards_token') ?? '' : '';
        cb({ token });
      },
    });
  }
  return _socket;
}


