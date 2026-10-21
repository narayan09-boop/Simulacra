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

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    if (!snapshot) {
      // Empty state placeholder
      ctx.fillStyle = '#1e293b';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No active simulation state', width / 2, height / 2);
      return;
    }

    const gridW = snapshot.width;
    const gridH = snapshot.height;

    const cellSize = Math.min((width - 40) / gridW, (height - 40) / gridH);
    const offsetX = (width - gridW * cellSize) / 2;
    const offsetY = (height - gridH * cellSize) / 2;

    // 1. Draw Grid Lines
    ctx.strokeStyle = '#151e32';
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

    // 2. Draw Obstacles
    const obstacleSet = new Set(snapshot.obstacles.map(([ox, oy]) => `${ox},${oy}`));
    snapshot.obstacles.forEach(([ox, oy]) => {
      const rx = offsetX + ox * cellSize;
      const ry = offsetY + oy * cellSize;
      
      // Gradient fill for obstacles
      const grad = ctx.createLinearGradient(rx, ry, rx + cellSize, ry + cellSize);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx + 1, ry + 1, cellSize - 2, cellSize - 2);

      // Subtle cross hatch
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.beginPath();
      ctx.moveTo(rx + 3, ry + 3);
      ctx.lineTo(rx + cellSize - 3, ry + cellSize - 3);
      ctx.stroke();
    });

    // 3. Draw Comparison Trajectories if provided
    if (comparisonTrajectories.length > 0) {
      comparisonTrajectories.forEach((traj) => {
        if (traj.points.length < 2) return;
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = 2.5;
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

    // 4. Draw Primary Trajectory Trail
    if (showTrajectory && snapshot.trajectory && snapshot.trajectory.length > 1 && comparisonTrajectories.length === 0) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      snapshot.trajectory.forEach(([tx, ty], idx) => {
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // Draw breadcrumb dots
      snapshot.trajectory.forEach(([tx, ty]) => {
        const cx = offsetX + (tx + 0.5) * cellSize;
        const cy = offsetY + (ty + 0.5) * cellSize;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5. Draw Goal Beacon
    const [gx, gy] = snapshot.goal_pos;
    const goalCenterX = offsetX + (gx + 0.5) * cellSize;
    const goalCenterY = offsetY + (gy + 0.5) * cellSize;
    const goalRadius = cellSize * 0.38;

    // Outer glow
    const goalGlow = ctx.createRadialGradient(
      goalCenterX, goalCenterY, goalRadius * 0.2,
      goalCenterX, goalCenterY, goalRadius * 1.6
    );
    goalGlow.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
    goalGlow.addColorStop(0.5, 'rgba(16, 185, 129, 0.25)');
    goalGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = goalGlow;
    ctx.beginPath();
    ctx.arc(goalCenterX, goalCenterY, goalRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Goal Core
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(goalCenterX, goalCenterY, goalRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Goal Icon 'G'
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.4))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('G', goalCenterX, goalCenterY);

    // 6. Draw Agent
    const [ax, ay] = snapshot.agent_pos;
    const agentCenterX = offsetX + (ax + 0.5) * cellSize;
    const agentCenterY = offsetY + (ay + 0.5) * cellSize;
    const agentRadius = cellSize * 0.38;

    // Agent Glow
    const agentGlow = ctx.createRadialGradient(
      agentCenterX, agentCenterY, agentRadius * 0.2,
      agentCenterX, agentCenterY, agentRadius * 1.5
    );
    agentGlow.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
    agentGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.3)');
    agentGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = agentGlow;
    ctx.beginPath();
    ctx.arc(agentCenterX, agentCenterY, agentRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Agent Body
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(agentCenterX, agentCenterY, agentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional orientation indicator based on last action taken
    if (snapshot.action_taken !== undefined && snapshot.action_taken !== null) {
      let angle = -Math.PI / 2; // Default UP
      if (snapshot.action_taken === 1) angle = Math.PI / 2;    // DOWN
      if (snapshot.action_taken === 2) angle = Math.PI;         // LEFT
      if (snapshot.action_taken === 3) angle = 0;               // RIGHT

      const eyeX = agentCenterX + Math.cos(angle) * (agentRadius * 0.55);
      const eyeY = agentCenterY + Math.sin(angle) * (agentRadius * 0.55);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, agentRadius * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#083344';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, agentRadius * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.4))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', agentCenterX, agentCenterY);
    }

    // Success Burst
    if (snapshot.is_success) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(agentCenterX, agentCenterY, agentRadius * 1.8, 0, Math.PI * 2);
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
    const cellSize = Math.min((rect.width - 40) / gridW, (rect.height - 40) / gridH);
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
        className="w-full h-full rounded-lg cursor-pointer transition-all duration-150"
      />
    </div>
  );
};
