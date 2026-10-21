import React, { useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Technical Neutral Background
    ctx.fillStyle = '#171918';
    ctx.fillRect(0, 0, width, height);

    if (!snapshot) {
      ctx.fillStyle = '#777F77';
      ctx.font = '12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AWAITING ENVIRONMENT INITIALIZATION', width / 2, height / 2);
      return;
    }

    const gridW = snapshot.width;
    const gridH = snapshot.height;

    const padding = 24;
    const cellSize = Math.min((width - padding * 2) / gridW, (height - padding * 2) / gridH);
    const offsetX = (width - gridW * cellSize) / 2;
    const offsetY = (height - gridH * cellSize) / 2;

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
    snapshot.obstacles.forEach(([ox, oy]) => {
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
    if (showTrajectory && snapshot.trajectory && snapshot.trajectory.length > 1 && comparisonTrajectories.length === 0) {
      ctx.strokeStyle = '#A8C9A5';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      snapshot.trajectory.forEach(([tx, ty], idx) => {
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Small precise breadcrumb dots
      snapshot.trajectory.forEach(([tx, ty], idx) => {
        if (idx === 0 || idx === snapshot.trajectory.length - 1) return;
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        ctx.fillStyle = '#59745D';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 6. Target Beacon (Restrained concentric target reticle)
    const [gx, gy] = snapshot.goal_pos;
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

    // 7. Agent (Restrained warm brass circle with directional orientation arrow)
    const [ax, ay] = snapshot.agent_pos;
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
    if (snapshot.action_taken === 1) angle = Math.PI / 2;    // DOWN
    if (snapshot.action_taken === 2) angle = Math.PI;         // LEFT
    if (snapshot.action_taken === 3) angle = 0;               // RIGHT

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
    if (snapshot.is_success) {
      ctx.strokeStyle = '#86A98A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(agentCenterX, agentCenterY, agentRadius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [snapshot, showTrajectory, comparisonTrajectories]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onCellClick || !snapshot) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gridW = snapshot.width;
    const gridH = snapshot.height;
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
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full rounded-[4px] cursor-crosshair"
      />
    </div>
  );
};
