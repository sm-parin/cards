import { useState, useEffect } from 'react';
import { getSocket } from './createSocket';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

interface UseGameConnectionReturn {
  status: ConnectionStatus;
  isConnected: boolean;
}

/**
 * Track socket connection status.
 * Use this to show reconnecting / error UI when the connection drops.
 */
export function useGameConnection(): UseGameConnectionReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const socket = getSocket();

    const onConnect    = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnect  = () => setStatus('reconnecting');
    const onError      = () => setStatus('error');

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('reconnect_attempt', onReconnect);
    socket.on('connect_error',     onError);

    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect',           onConnect);
      socket.off('disconnect',        onDisconnect);
      socket.off('reconnect_attempt', onReconnect);
      socket.off('connect_error',     onError);
    };
  }, []);

  return {
    status,
    isConnected: status === 'connected',
  };
}
