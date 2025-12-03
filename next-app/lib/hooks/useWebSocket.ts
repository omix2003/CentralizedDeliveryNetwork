import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const { enabled = true, onConnect, onDisconnect, onError } = options;
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  // Store callbacks in refs to prevent unnecessary reconnections
  const callbacksRef = useRef({ onConnect, onDisconnect, onError });
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onConnect, onDisconnect, onError };
  }, [onConnect, onDisconnect, onError]);

  const getWebSocketURL = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    // Remove /api to get base URL
    let baseUrl = apiUrl.replace('/api', '');
    
    // Ensure we use the correct protocol (wss for https, ws for http)
    // Socket.io handles this automatically, but we need to ensure the URL is correct
    if (baseUrl.startsWith('https://')) {
      // Socket.io will automatically use wss:// for secure connections
      baseUrl = baseUrl.replace('https://', 'https://');
    } else if (baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'http://');
    }
    
    return baseUrl;
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !session?.accessToken) {
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setStatus('connecting');

    const wsUrl = getWebSocketURL();
    console.log('[WebSocket] Connecting to:', wsUrl);
    
    const socket = io(wsUrl, {
      path: '/socket.io',
      auth: {
        token: session.accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      // Add extra options for production
      upgrade: true,
      rememberUpgrade: false,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
      callbacksRef.current.onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setStatus('disconnected');
      callbacksRef.current.onDisconnect?.();

      // Attempt manual reconnection if not intentional and still enabled
      if (reason !== 'io client disconnect' && enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          // Check if still enabled before reconnecting
          if (enabled && session?.accessToken) {
            connect();
          }
        }, Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 5000));
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setStatus('error');
      callbacksRef.current.onError?.(error);
    });

    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      callbacksRef.current.onError?.(new Error(error.message || 'WebSocket error'));
    });

    socketRef.current = socket;
  }, [enabled, session?.accessToken, getWebSocketURL]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('[WebSocket] Cannot emit: socket not connected');
    return false;
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
    return () => {};
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  useEffect(() => {
    if (enabled && session?.accessToken) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, session?.accessToken]);

  return {
    socket: socketRef.current,
    status,
    connected: status === 'connected',
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}







