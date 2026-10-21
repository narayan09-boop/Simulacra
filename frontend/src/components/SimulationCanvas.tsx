import React, { useEffect, useRef, useCallback } from 'react';
import { SimulationSnapshot } from '../types';

interface SimulationCanvasProps {
  snapshot: SimulationSnapshot | null;
  interactive?: boolean;
  onCellClick?: (x: number, y: number) => void;
  showTrajectory?: boolean;
  className?: string;
  comparisonTrajectories?: {
    name: string;
    color: string;
    points: [number, number][];
  }[];
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  snapshot,
  interactive = false,
  onCellClick,
  showTrajectory = true,
  className = '',
  comparisonTrajectories = []
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep last known valid snapshot to prevent flickering when live snapshot updates
  const lastSnapshotRef = useRef<SimulationSnapshot | null>(snapshot);
  if (snapshot) {
    lastSnapshotRef.current = snapshot;
  }

  // Animation frame id tracker
  const animationFrameRef = useRef<number | null>(null);

  // Store layout dimensions to avoid redundant reallocations
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 0
  });

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSnapshot = snapshot || lastSnapshotRef.current;

    // Measure container element for stable layout bounds
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetPixelWidth = Math.floor(width * dpr);
    const targetPixelHeight = Math.floor(height * dpr);

    // Only re-allocate canvas backing store if dimensions actually changed
    if (
      canvas.width !== targetPixelWidth ||
      canvas.height !== targetPixelHeight ||
      sizeRef.current.width !== width ||
      sizeRef.current.height !== height ||
      sizeRef.current.dpr !== dpr
    ) {
      canvas.width = targetPixelWidth;
      canvas.height = targetPixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      sizeRef.current = { width, height, dpr };
    }

    // Set high-DPI transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Technical Neutral Background
    ctx.fillStyle = '#171918';
    ctx.fillRect(0, 0, width, height);

    if (!currentSnapshot) {
      ctx.fillStyle = '#777F77';
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AWAITING ENVIRONMENT INITIALIZATION', width / 2, height / 2);
      return;
    }

    const gridW = currentSnapshot.width || 10;
    const gridH = currentSnapshot.height || 10;

    const padding = 24;
    const cellSize = Math.max(8, Math.min((width - padding * 2) / gridW, (height - padding * 2) / gridH));
    const offsetX = Math.floor((width - gridW * cellSize) / 2);
    const offsetY = Math.floor((height - gridH * cellSize) / 2);

    // 2. Subtle Precision Grid
    ctx.strokeStyle = '#252A26';
    ctx.lineWidth = 1;

    for (let x = 0; x <= gridW; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + gridH * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= gridH; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cellSize);
      ctx.lineTo(offsetX + gridW * cellSize, offsetY + y * cellSize);
      ctx.stroke();
    }

    // Grid outer border
    ctx.strokeStyle = '#383E38';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, gridW * cellSize, gridH * cellSize);

    // Coordinate tick marks on axes (subtle)
    ctx.fillStyle = '#4A5149';
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = 0; x < gridW; x += Math.max(1, Math.floor(gridW / 5))) {
      ctx.fillText(x.toString(), offsetX + (x + 0.5) * cellSize, offsetY - 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < gridH; y += Math.max(1, Math.floor(gridH / 5))) {
      ctx.fillText(y.toString(), offsetX - 6, offsetY + (y + 0.5) * cellSize);
    }

    // 3. Obstacles (Solid architectural dark blocks with clean border)
    if (currentSnapshot.obstacles) {
      currentSnapshot.obstacles.forEach(([ox, oy]) => {
        const rx = offsetX + ox * cellSize;
        const ry = offsetY + oy * cellSize;

        ctx.fillStyle = '#2B302B';
        ctx.fillRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);

        ctx.strokeStyle = '#383E38';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);

        // Subtle diagonal corner hatch for tactile contrast
        ctx.strokeStyle = '#333A34';
        ctx.beginPath();
        ctx.moveTo(rx + 3, ry + 3);
        ctx.lineTo(rx + cellSize - 3, ry + cellSize - 3);
        ctx.stroke();
      });
    }

    // 4. Comparison Trajectories
    if (comparisonTrajectories.length > 0) {
      comparisonTrajectories.forEach((traj) => {
        if (traj.points.length < 2) return;
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        traj.points.forEach(([px, py], idx) => {
          const cx = offsetX + (px + 0.5) * cellSize;
          const cy = offsetY + (py + 0.5) * cellSize;
          if (idx === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();
      });
    }

    // 5. Active Episode Trajectory
    if (
      showTrajectory &&
      currentSnapshot.trajectory &&
      currentSnapshot.trajectory.length > 1 &&
      comparisonTrajectories.length === 0
    ) {
      ctx.strokeStyle = '#A8C9A5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      currentSnapshot.trajectory.forEach(([tx, ty], idx) => {
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Small precise breadcrumb dots
      currentSnapshot.trajectory.forEach(([tx, ty], idx) => {
        if (idx === 0 || idx === currentSnapshot.trajectory.length - 1) return;
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        ctx.fillStyle = '#59745D';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 6. Target Beacon (Restrained concentric target reticle)
    if (currentSnapshot.goal_pos) {
      const [gx, gy] = currentSnapshot.goal_pos;
      const goalCenterX = offsetX + (gx + 0.5) * cellSize;
      const goalCenterY = offsetY + (gy + 0.5) * cellSize;
      const targetRadius = cellSize * 0.36;

      // Outer subtle ring
      ctx.strokeStyle = '#86A98A';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(goalCenterX, goalCenterY, targetRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner reticle cross
      const crossSize = targetRadius * 0.5;
      ctx.strokeStyle = '#86A98A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(goalCenterX - crossSize, goalCenterY);
      ctx.lineTo(goalCenterX + crossSize, goalCenterY);
      ctx.moveTo(goalCenterX, goalCenterY - crossSize);
      ctx.lineTo(goalCenterX, goalCenterY + crossSize);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#86A98A';
      ctx.beginPath();
      ctx.arc(goalCenterX, goalCenterY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Agent (Restrained warm brass circle with directional orientation arrow)
    if (currentSnapshot.agent_pos) {
      const [ax, ay] = currentSnapshot.agent_pos;
      const agentCenterX = offsetX + (ax + 0.5) * cellSize;
      const agentCenterY = offsetY + (ay + 0.5) * cellSize;
      const agentRadius = cellSize * 0.35;

      // Agent body
      ctx.fillStyle = '#D6BD88';
      ctx.beginPath();
      ctx.arc(agentCenterX, agentCenterY, agentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#F0EEE7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Directional indicator
      let angle = -Math.PI / 2; // Default UP
      if (currentSnapshot.action_taken === 1) angle = Math.PI / 2;    // DOWN
      if (currentSnapshot.action_taken === 2) angle = Math.PI;         // LEFT
      if (currentSnapshot.action_taken === 3) angle = 0;               // RIGHT

      // Directional pointer line from center
      const tipX = agentCenterX + Math.cos(angle) * (agentRadius * 0.7);
      const tipY = agentCenterY + Math.sin(angle) * (agentRadius * 0.7);
      ctx.strokeStyle = '#171918';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(agentCenterX, agentCenterY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Goal Reach success indicator
      if (currentSnapshot.is_success) {
        ctx.strokeStyle = '#86A98A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(agentCenterX, agentCenterY, agentRadius * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [snapshot, showTrajectory, comparisonTrajectories]);

  // Schedule render via requestAnimationFrame to avoid thrashing
  useEffect(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      renderFrame();
      animationFrameRef.current = null;
    });

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderFrame]);

  // Handle container resizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        renderFrame();
        animationFrameRef.current = null;
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [renderFrame]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const currentSnapshot = snapshot || lastSnapshotRef.current;
    if (!interactive || !onCellClick || !currentSnapshot) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gridW = currentSnapshot.width;
    const gridH = currentSnapshot.height;
    const padding = 24;
    const cellSize = Math.min((rect.width - padding * 2) / gridW, (rect.height - padding * 2) / gridH);
    const offsetX = (rect.width - gridW * cellSize) / 2;
    const offsetY = (rect.height - gridH * cellSize) / 2;

    const cellX = Math.floor((clickX - offsetX) / cellSize);
    const cellY = Math.floor((clickY - offsetY) / cellSize);

    if (cellX >= 0 && cellX < gridW && cellY >= 0 && cellY < gridH) {
      onCellClick(cellX, cellY);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-w-0 min-h-0 overflow-hidden flex items-center justify-center ${className}`}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block cursor-crosshair"
      />
    </div>
  );
};
