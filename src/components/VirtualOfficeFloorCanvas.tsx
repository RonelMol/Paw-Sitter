import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AgentId,
  ZoneId,
  AgentOfficeProfile,
  OfficeZone,
  OFFICE_ZONES
} from "../services/OfficeAgentService";
import { Sparkles, Activity, ShieldCheck, DollarSign, Clock, Radio, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

interface VirtualOfficeFloorCanvasProps {
  agents: Record<AgentId, AgentOfficeProfile>;
  selectedAgentId: AgentId | null;
  onSelectAgent: (agentId: AgentId) => void;
  speed?: 1 | 2;
}

// Convert 2D grid coordinates (0-100, 0-100) to 2.5D Isometric Screen Coordinates (SVG space)
// Standard 2:1 Isometric Projection:
// screenX = originX + (x - y) * isoWidth
// screenY = originY + (x + y) * isoHeight
const ORIGIN_X = 520;
const ORIGIN_Y = 160;
const ISO_X = 4.8;
const ISO_Y = 2.45;

function toIso(x: number, y: number, z = 0): [number, number] {
  const sx = ORIGIN_X + (x - y) * ISO_X;
  const sy = ORIGIN_Y + (x + y) * ISO_Y - z;
  return [sx, sy];
}

// Generate an isometric room polygon with vertical 3D wall extrusions
function makeIsoRoom(bounds: { minX: number; maxX: number; minY: number; maxY: number }, wallHeight = 28) {
  const p0 = toIso(bounds.minX, bounds.minY); // Top
  const p1 = toIso(bounds.maxX, bounds.minY); // Right
  const p2 = toIso(bounds.maxX, bounds.maxY); // Bottom
  const p3 = toIso(bounds.minX, bounds.maxY); // Left

  // Floor polygon
  const floorPath = `M ${p0[0]} ${p0[1]} L ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} Z`;

  // Back wall 1 (Top-Left wall extruded upwards)
  const p0Top = [p0[0], p0[1] - wallHeight];
  const p3Top = [p3[0], p3[1] - wallHeight];
  const wallLeft = `M ${p3[0]} ${p3[1]} L ${p0[0]} ${p0[1]} L ${p0Top[0]} ${p0Top[1]} L ${p3Top[0]} ${p3Top[1]} Z`;

  // Back wall 2 (Top-Right wall extruded upwards)
  const p1Top = [p1[0], p1[1] - wallHeight];
  const wallRight = `M ${p0[0]} ${p0[1]} L ${p1[0]} ${p1[1]} L ${p1Top[0]} ${p1Top[1]} L ${p0Top[0]} ${p0Top[1]} Z`;

  return { floorPath, wallLeft, wallRight, p0, p1, p2, p3, p0Top, p1Top, p3Top };
}

export function VirtualOfficeFloorCanvas({
  agents,
  selectedAgentId,
  onSelectAgent,
  speed = 1
}: VirtualOfficeFloorCanvasProps) {
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<ZoneId | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Smooth position interpolation for agents
  const [renderPositions, setRenderPositions] = useState<Record<AgentId, { x: number; y: number }>>(() => {
    const initial: Record<AgentId, { x: number; y: number }> = {} as any;
    for (const [id, a] of Object.entries(agents)) {
      initial[id as AgentId] = { x: a.currentPos.x, y: a.currentPos.y };
    }
    return initial;
  });

  // Animation frame loop for silky smooth character gliding
  useEffect(() => {
    let animId: number;
    const step = () => {
      setRenderPositions((prev) => {
        let hasChanges = false;
        const next: Record<AgentId, { x: number; y: number }> = { ...prev };

        for (const [id, a] of Object.entries(agents)) {
          const aid = id as AgentId;
          const cur = prev[aid] || { x: a.currentPos.x, y: a.currentPos.y };
          const target = a.currentPos;
          const dx = target.x - cur.x;
          const dy = target.y - cur.y;

          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            hasChanges = true;
            next[aid] = {
              x: cur.x + dx * (0.08 * speed),
              y: cur.y + dy * (0.08 * speed)
            };
          } else {
            next[aid] = target;
          }
        }

        return hasChanges ? next : prev;
      });

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [agents, speed]);

  // Depth sorting: Elements with lower (x + y) are further back; elements with higher (x + y) are in front
  const sortedAgents = useMemo(() => {
    return Object.values(agents).sort((a, b) => {
      const posA = renderPositions[a.id] || a.currentPos;
      const posB = renderPositions[b.id] || b.currentPos;
      return (posA.x + posA.y) - (posB.x + posB.y);
    });
  }, [agents, renderPositions]);

  // Precompute isometric paths for the 6 zones
  const renderedZones = useMemo(() => {
    return Object.values(OFFICE_ZONES).map((zone) => ({
      ...zone,
      iso: makeIsoRoom(zone.bounds, 24)
    }));
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-[#070B14] border border-slate-800 shadow-2xl select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs font-mono text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">LIVE 2.5D INTER-MODULE SIMULATOR</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400">8 Agents Active</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md p-1 rounded-xl text-slate-300">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
          className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono px-1 text-slate-400">{Math.round(zoomLevel * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
          className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(1)}
          className="px-2 py-1 text-[11px] font-semibold hover:bg-slate-800 rounded-lg hover:text-white transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>

      {/* Main Isometric SVG Canvas */}
      <div className="w-full flex items-center justify-center p-2 sm:p-4 overflow-x-auto min-h-[580px]">
        <svg
          viewBox="0 0 1040 680"
          className="w-full max-w-[1040px] h-auto transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="isoGrid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 0 10 L 20 0 L 40 10 L 20 20 Z" fill="none" stroke="#131B2E" strokeWidth="0.8" />
            </pattern>

            {/* Glowing Gradients */}
            <radialGradient id="deskGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </radialGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Base Isometric Background Grid Floor */}
          <polygon
            points="520,10 1030,265 520,520 10,265"
            fill="#090E1A"
            stroke="#162036"
            strokeWidth="1.5"
          />

          {/* Isometric grid tile lines */}
          <g opacity="0.6">
            {[10, 25, 40, 55, 70, 85, 100].map((v) => {
              const start = toIso(0, v);
              const end = toIso(100, v);
              return <line key={`h_${v}`} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke="#111A2D" strokeWidth="0.8" />;
            })}
            {[10, 25, 40, 55, 70, 85, 100].map((v) => {
              const start = toIso(v, 0);
              const end = toIso(v, 100);
              return <line key={`v_${v}`} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke="#111A2D" strokeWidth="0.8" />;
            })}
          </g>

          {/* 2. Render 6 Department Room Zones with Isometric Walls & Glowing Borders */}
          {renderedZones.map((zone) => {
            const isHovered = hoveredZoneId === zone.id;
            return (
              <g
                key={zone.id}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                className="transition-opacity duration-300 cursor-default"
              >
                {/* Back 3D Wall 1 (Left wall) */}
                <path
                  d={zone.iso.wallLeft}
                  fill={zone.color}
                  fillOpacity={isHovered ? "0.22" : "0.14"}
                  stroke={zone.accentColor}
                  strokeWidth="1.2"
                />

                {/* Back 3D Wall 2 (Right wall) */}
                <path
                  d={zone.iso.wallRight}
                  fill={zone.color}
                  fillOpacity={isHovered ? "0.18" : "0.10"}
                  stroke={zone.accentColor}
                  strokeWidth="1.2"
                />

                {/* Main Isometric Floor Plate */}
                <path
                  d={zone.iso.floorPath}
                  fill={zone.color}
                  fillOpacity={isHovered ? "0.12" : "0.06"}
                  stroke={zone.accentColor}
                  strokeWidth={isHovered ? "2.2" : "1.5"}
                  filter={isHovered ? "url(#neonGlow)" : undefined}
                />

                {/* Department Header Badge Tag placed on Top Wall */}
                <g transform={`translate(${zone.iso.p0Top[0]}, ${zone.iso.p0Top[1] + 8})`}>
                  <rect
                    x="-75"
                    y="-12"
                    width="150"
                    height="22"
                    rx="11"
                    fill="#080D1A"
                    stroke={zone.accentColor}
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="9.5"
                    fontWeight="800"
                    letterSpacing="0.8"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {zone.name}
                  </text>
                </g>

                {/* Isometric Desks & Computer Workstations inside the zone */}
                {zone.desks.map((desk) => {
                  const [dx, dy] = toIso(desk.x, desk.y);
                  return (
                    <g key={desk.id} transform={`translate(${dx}, ${dy})`}>
                      {/* Desk Isometric Top */}
                      <polygon
                        points="-16,-6 0,-14 16,-6 0,2"
                        fill="#1E293B"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      {/* Desk Front Sides */}
                      <polygon points="-16,-6 0,2 0,9 -16,1" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
                      <polygon points="16,-6 0,2 0,9 16,1" fill="#152136" stroke="#334155" strokeWidth="0.8" />

                      {/* Computer Screen glowing */}
                      <rect
                        x="-5"
                        y="-16"
                        width="10"
                        height="7"
                        rx="1"
                        fill="#38BDF8"
                        filter="url(#neonGlow)"
                        opacity="0.9"
                      />
                      <line x1="0" y1="-9" x2="0" y2="-6" stroke="#94A3B8" strokeWidth="1" />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* 3. Render Inter-Module Walking Agents (Depth-Sorted) */}
          {sortedAgents.map((agent) => {
            const pos = renderPositions[agent.id] || agent.currentPos;
            const [sx, sy] = toIso(pos.x, pos.y);
            const isSelected = selectedAgentId === agent.id;
            const isHovered = hoveredAgentId === agent.id;

            return (
              <g
                key={agent.id}
                transform={`translate(${sx}, ${sy})`}
                onClick={() => onSelectAgent(agent.id)}
                onMouseEnter={() => setHoveredAgentId(agent.id)}
                onMouseLeave={() => setHoveredAgentId(null)}
                className="cursor-pointer transition-transform"
              >
                {/* Ground Shadow & Selection Aura */}
                <ellipse
                  cx="0"
                  cy="2"
                  rx={isSelected ? "18" : "12"}
                  ry={isSelected ? "9" : "6"}
                  fill={isSelected ? agent.avatarColor : "rgba(0,0,0,0.6)"}
                  fillOpacity={isSelected ? "0.3" : "0.6"}
                  stroke={isSelected ? agent.avatarColor : "none"}
                  strokeWidth={isSelected ? "1.8" : "0"}
                  filter={isSelected ? "url(#neonGlow)" : undefined}
                />

                {/* Character 2.5D Body Pin / Avatar Token */}
                <g transform="translate(0, -14)">
                  {/* Outer glow ring when hovered or selected */}
                  {(isSelected || isHovered) && (
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="none"
                      stroke={agent.avatarColor}
                      strokeWidth="2"
                      strokeDasharray={isSelected ? "none" : "3 2"}
                      className={isSelected ? "animate-spin-slow" : ""}
                    />
                  )}

                  {/* Character Body Base */}
                  <rect
                    x="-6"
                    y="2"
                    width="12"
                    height="12"
                    rx="4"
                    fill={agent.avatarColor}
                    stroke="#0B0F19"
                    strokeWidth="1.5"
                  />

                  {/* Character Round Head */}
                  <circle
                    cx="0"
                    cy="-2"
                    r="6.5"
                    fill="#FEF08A"
                    stroke="#0B0F19"
                    strokeWidth="1.5"
                  />

                  {/* Character Tie / Collar Accent */}
                  <circle cx="0" cy="5" r="1.5" fill="#FFFFFF" />
                </g>

                {/* Agent Name Badge Pill matching the screenshot */}
                <g transform="translate(0, -32)">
                  <rect
                    x="-32"
                    y="-9"
                    width="64"
                    height="18"
                    rx="9"
                    fill="#0F172A"
                    stroke={isSelected ? agent.avatarColor : "#334155"}
                    strokeWidth={isSelected ? "1.5" : "1"}
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                  />
                  {/* Status Indicator Dot */}
                  <circle
                    cx="-20"
                    cy="0"
                    r="3"
                    fill={agent.state === "AT_DESK" ? "#10B981" : agent.state === "WALKING" ? "#F59E0B" : "#A855F7"}
                  />
                  <text
                    x="-12"
                    y="3"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {agent.name}
                  </text>
                </g>

                {/* Dynamic Speech Bubble (if active) matching reference speech tags */}
                {agent.speech && (
                  <g transform="translate(0, -60)" className="animate-fade-in">
                    {/* Speech Bubble Container */}
                    <rect
                      x="-65"
                      y="-12"
                      width="130"
                      height="24"
                      rx="8"
                      fill="#FFFFFF"
                      stroke={agent.speech.style === "alert" ? "#EF4444" : agent.speech.style === "success" ? "#10B981" : "#F59E0B"}
                      strokeWidth="2"
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.6))"
                    />
                    {/* Downward Pointer Triangle */}
                    <polygon
                      points="-4,12 4,12 0,17"
                      fill="#FFFFFF"
                      stroke={agent.speech.style === "alert" ? "#EF4444" : agent.speech.style === "success" ? "#10B981" : "#F59E0B"}
                      strokeWidth="2"
                    />
                    <polygon points="-3,11 3,11 0,15" fill="#FFFFFF" />

                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#0F172A"
                      fontSize="9.5"
                      fontWeight="800"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {agent.speech.text}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Explanatory Legend (Exact reproduction of screenshot footer) */}
      <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">👆</span>
          <span className="text-slate-300 font-medium">
            Click any AI employee on the floor map to inspect their live mission and linked module.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-slate-300">Working at Desk</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-slate-300">Walking Hallway</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
            <span className="text-slate-300">Resting in Pantry Lounge</span>
          </span>
        </div>
      </div>
    </div>
  );
}
