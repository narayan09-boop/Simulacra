import { useEffect, useRef, useState, useCallback } from 'react';
import { TelemetryEvent, SimulationSnapshot } from '../types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface UseTelemetryOptions {
  experimentId?: string;
  onSnapshot?: (snapshot: SimulationSnapshot) => void;
  onMetric?: (metric: any) => void;
  onJobStatus?: (status: { experiment_id: string; status: string }) => void;
  onCheckpoint?: (data: any) => void;
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastLatency, setLastLatency] = useState<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const pingTimestampRef = useRef<number>(0);

  const { experimentId, onSnapshot, onMetric, onJobStatus, onCheckpoint } = options;

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        if (experimentId) {
          ws.send(JSON.stringify({ action: 'subscribe', experiment_id: experimentId }));
        }

        // Heartbeat ping every 10s
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimestampRef.current = Date.now();
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryEvent = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            const rtt = Date.now() - pingTimestampRef.current;
            setLastLatency(rtt);
            return;
          }

          if (data.type === 'snapshot' && onSnapshot) {
            onSnapshot(data.payload);
          } else if (data.type === 'metric_update' && onMetric) {
            onMetric(data.payload);
          } else if (data.type === 'job_status' && onJobStatus) {
            onJobStatus(data.payload);
          } else if (data.type === 'checkpoint_saved' && onCheckpoint) {
            onCheckpoint(data.payload);
          }
        } catch (e) {
          console.warn('Failed to parse websocket event', e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Exponential backoff reconnect attempt
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setStatus('disconnected');
      };
    } catch (e) {
      setStatus('disconnected');
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [experimentId, onSnapshot, onMetric, onJobStatus, onCheckpoint]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // If experimentId changes, update subscription
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && experimentId) {
      socketRef.current.send(JSON.stringify({ action: 'subscribe', experiment_id: experimentId }));
    }
  }, [experimentId]);

  return { status, lastLatency };
}
