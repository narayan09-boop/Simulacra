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

  // Store callbacks in refs to avoid recreating the connection on every render
  const onSnapshotRef = useRef(options.onSnapshot);
  const onMetricRef = useRef(options.onMetric);
  const onJobStatusRef = useRef(options.onJobStatus);
  const onCheckpointRef = useRef(options.onCheckpoint);
  const experimentIdRef = useRef(options.experimentId);

  useEffect(() => {
    onSnapshotRef.current = options.onSnapshot;
    onMetricRef.current = options.onMetric;
    onJobStatusRef.current = options.onJobStatus;
    onCheckpointRef.current = options.onCheckpoint;
    experimentIdRef.current = options.experimentId;
  });

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
        const currentExpId = experimentIdRef.current;
        if (currentExpId) {
          ws.send(JSON.stringify({ action: 'subscribe', experiment_id: currentExpId }));
        }

        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
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

          if (data.type === 'snapshot' && onSnapshotRef.current) {
            onSnapshotRef.current(data.payload);
          } else if (data.type === 'metric_update' && onMetricRef.current) {
            onMetricRef.current(data.payload);
          } else if (data.type === 'job_status' && onJobStatusRef.current) {
            onJobStatusRef.current(data.payload);
          } else if (data.type === 'checkpoint_saved' && onCheckpointRef.current) {
            onCheckpointRef.current(data.payload);
          }
        } catch (e) {
          console.warn('Failed to parse websocket event', e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Exponential backoff reconnect attempt
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setStatus('disconnected');
      };
    } catch (e) {
      setStatus('disconnected');
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

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

  // If experimentId changes, update subscription on existing connection without reconnecting
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && options.experimentId) {
      socketRef.current.send(JSON.stringify({ action: 'subscribe', experiment_id: options.experimentId }));
    }
  }, [options.experimentId]);

  return { status, lastLatency };
}
