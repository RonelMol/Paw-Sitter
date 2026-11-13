import type { Response } from "express";
import { pool } from "../db/index.ts";

export type AgentId = "boss" | "kinsenas" | "librarian" | "vero" | "bantay" | "balanse" | "vercelbot" | "tala";
export const AgentId = {};
export type ZoneId = "command_center" | "financial_ops" | "cyber_intel" | "dev_studio" | "pantry_lounge" | "gym_zone";
export const ZoneId = {};
export type AgentState = "AT_DESK" | "WALKING" | "IN_LOUNGE" | "IN_MEETING";
export const AgentState = {};

export interface AgentOfficeProfile {
  id: AgentId;
  name: string;
  role: string;
  department: string;
  avatarColor: string;
  badgeBg: string;
  textColor: string;
  zone: ZoneId;
  deskPos: { x: number; y: number };
  currentPos: { x: number; y: number };
  targetPos: { x: number; y: number };
  state: AgentState;
  speech: { text: string; expiresAt: number; style?: "info" | "success" | "warning" | "alert" } | null;
  currentMission: string;
  linkedModuleUrl: string;
  recentMessages: Array<{ id: string; from: string; to: string; text: string; timestamp: string }>;
  stats: {
    tasksCompleted: number;
    messagesExchanged: number;
    healthPct: number;
    latencyMs: number;
  };
}

export interface OfficeZone {
  id: ZoneId;
  name: string;
  color: string;
  accentColor: string;
  glowColor: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  desks: Array<{ id: string; x: number; y: number; label: string; agentId?: AgentId }>;
  description: string;
}

export interface InterModuleEvent {
  id: string;
  type: "ESCROW_LOCK" | "PAYOUT_DISBURSEMENT" | "SECURITY_PROBE" | "SEO_AUDIT" | "QA_VERIFY" | "BOOKING_DISPATCH" | "INTER_AGENT_SYNC";
  sourceAgent: AgentId;
  targetAgent: AgentId;
  sourceZone: ZoneId;
  targetZone: ZoneId;
  summary: string;
  speechText: string;
  timestamp: string;
  payload?: any;
}

// 6 Department Zones positioned on the 2.5D Isometric Floor Plan
export const OFFICE_ZONES: Record<ZoneId, OfficeZone> = {
  command_center: {
    id: "command_center",
    name: "COMMAND CENTER",
    color: "#F59E0B", // Amber
    accentColor: "#FBBF24",
    glowColor: "rgba(245, 158, 11, 0.18)",
    bounds: { minX: 42, maxX: 66, minY: 36, maxY: 60 },
    desks: [
      { id: "desk_boss", x: 52, y: 46, label: "CEO / Chief Orchestrator", agentId: "boss" },
      { id: "desk_tala", x: 60, y: 52, label: "Marketplace Operations", agentId: "tala" },
    ],
    description: "Central executive node orchestrating multi-agent workflows and marketplace state."
  },
  financial_ops: {
    id: "financial_ops",
    name: "FINANCIAL OPS HUB",
    color: "#10B981", // Emerald
    accentColor: "#34D399",
    glowColor: "rgba(16, 185, 129, 0.18)",
    bounds: { minX: 38, maxX: 64, minY: 8, maxY: 32 },
    desks: [
      { id: "desk_balanse", x: 46, y: 16, label: "Escrow Financial Sentinel", agentId: "balanse" },
      { id: "desk_kinsenas", x: 56, y: 24, label: "Sitter Payout Ledger", agentId: "kinsenas" },
    ],
    description: "Automated escrow lock, fee distribution, and GCash/BDO disbursement reconciliation."
  },
  pantry_lounge: {
    id: "pantry_lounge",
    name: "PANTRY & GAME LOUNGE",
    color: "#F97316", // Warm Coral / Orange
    accentColor: "#FB923C",
    glowColor: "rgba(249, 115, 22, 0.18)",
    bounds: { minX: 10, maxX: 38, minY: 36, maxY: 62 },
    desks: [
      { id: "desk_pantry_1", x: 20, y: 48, label: "Coffee & Strategy Bar" },
      { id: "desk_pantry_2", x: 30, y: 54, label: "Agent Recovery Station" },
    ],
    description: "Informal inter-agent coffee breaks, cache invalidation rest, and social coordination."
  },
  gym_zone: {
    id: "gym_zone",
    name: "PICKLEBALL & GYM ZONE",
    color: "#A855F7", // Purple
    accentColor: "#C084FC",
    glowColor: "rgba(168, 85, 247, 0.18)",
    bounds: { minX: 34, maxX: 62, minY: 64, maxY: 90 },
    desks: [
      { id: "desk_gym_1", x: 44, y: 74, label: "Court Baseline" },
      { id: "desk_gym_2", x: 52, y: 80, label: "Warmup Deck" },
    ],
    description: "Dynamic load balancing, micro-burst stress tests, and active agent wellness."
  },
  dev_studio: {
    id: "dev_studio",
    name: "DEV STUDIO & UX LAB",
    color: "#3B82F6", // Blue
    accentColor: "#60A5FA",
    glowColor: "rgba(59, 130, 246, 0.18)",
    bounds: { minX: 68, maxX: 94, minY: 56, maxY: 82 },
    desks: [
      { id: "desk_vercelbot", x: 78, y: 66, label: "Automated QA & CI/CD", agentId: "vercelbot" },
      { id: "desk_librarian", x: 86, y: 74, label: "UX & SEO Content Studio", agentId: "librarian" },
    ],
    description: "Vite/SSR build verification, automated regression tests, and SEO copy synthesis."
  },
  cyber_intel: {
    id: "cyber_intel",
    name: "CYBER & CLOUD INTEL LAB",
    color: "#06B6D4", // Cyan
    accentColor: "#22D3EE",
    glowColor: "rgba(6, 182, 212, 0.18)",
    bounds: { minX: 70, maxX: 96, minY: 28, maxY: 52 },
    desks: [
      { id: "desk_bantay", x: 78, y: 36, label: "OWASP & Intrusion Prober", agentId: "bantay" },
      { id: "desk_vero", x: 88, y: 44, label: "KYC & Identity Sentinel", agentId: "vero" },
    ],
    description: "Real-time vulnerability audit, anti-tampering guards, and Cloud SQL integrity."
  }
};

// Initial roster of 8 Autonomous AI Employees matching the visual reference
export const INITIAL_AGENTS: Record<AgentId, AgentOfficeProfile> = {
  boss: {
    id: "boss",
    name: "Boss",
    role: "Chief AI Orchestrator",
    department: "Executive Management",
    avatarColor: "#F59E0B",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    textColor: "text-amber-400",
    zone: "command_center",
    deskPos: { x: 52, y: 46 },
    currentPos: { x: 52, y: 46 },
    targetPos: { x: 52, y: 46 },
    state: "AT_DESK",
    speech: { text: "Net Worth ₱127.47M", expiresAt: Date.now() + 60000, style: "info" },
    currentMission: "Overseeing multi-agent fleet synchronization and platform liquidity balance.",
    linkedModuleUrl: "/admin/analytics",
    recentMessages: [
      { id: "m1", from: "Boss", to: "Balanse", text: "Verify 100% platform escrow coverage before night shift.", timestamp: "1 min ago" },
      { id: "m2", from: "Bantay", to: "Boss", text: "All OWASP ASVS endpoints report nominal latency.", timestamp: "3 mins ago" },
    ],
    stats: { tasksCompleted: 1420, messagesExchanged: 4320, healthPct: 100, latencyMs: 8 }
  },
  tala: {
    id: "tala",
    name: "Tala",
    role: "Marketplace Operations Coordinator",
    department: "Operations",
    avatarColor: "#EC4899",
    badgeBg: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    textColor: "text-pink-400",
    zone: "gym_zone",
    deskPos: { x: 60, y: 52 },
    currentPos: { x: 52, y: 80 },
    targetPos: { x: 52, y: 80 },
    state: "WALKING",
    speech: null,
    currentMission: "Monitoring pet sitter response benchmarks in BGC and Makati corridors.",
    linkedModuleUrl: "/admin/bookings",
    recentMessages: [
      { id: "m3", from: "Tala", to: "Librarian", text: "Demand surge detected in Taguig for cat drop-ins.", timestamp: "2 mins ago" },
    ],
    stats: { tasksCompleted: 890, messagesExchanged: 2410, healthPct: 98, latencyMs: 14 }
  },
  balanse: {
    id: "balanse",
    name: "Balanse",
    role: "Escrow Financial Sentinel",
    department: "Financial Operations",
    avatarColor: "#10B981",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    textColor: "text-emerald-400",
    zone: "command_center",
    deskPos: { x: 46, y: 16 },
    currentPos: { x: 44, y: 48 },
    targetPos: { x: 44, y: 48 },
    state: "WALKING",
    speech: { text: "On my way!", expiresAt: Date.now() + 45000, style: "info" },
    currentMission: "Locking funds into dual-key escrow for Booking #108.",
    linkedModuleUrl: "/admin/payouts",
    recentMessages: [
      { id: "m4", from: "Balanse", to: "Kinsenas", text: "₱12,500 held in platform escrow for 5-day boarding.", timestamp: "30s ago" },
    ],
    stats: { tasksCompleted: 1120, messagesExchanged: 3100, healthPct: 100, latencyMs: 12 }
  },
  kinsenas: {
    id: "kinsenas",
    name: "Kinsenas",
    role: "Payout Disbursement Ledger",
    department: "Financial Operations",
    avatarColor: "#059669",
    badgeBg: "bg-emerald-600/20 text-emerald-200 border-emerald-500/30",
    textColor: "text-emerald-300",
    zone: "pantry_lounge",
    deskPos: { x: 56, y: 24 },
    currentPos: { x: 22, y: 52 },
    targetPos: { x: 22, y: 52 },
    state: "IN_LOUNGE",
    speech: null,
    currentMission: "Taking a coffee break before scheduling bi-monthly GCash sitter payouts.",
    linkedModuleUrl: "/admin/payouts",
    recentMessages: [
      { id: "m5", from: "Kinsenas", to: "Boss", text: "Disbursement batch cleared: 0% reversal rate.", timestamp: "8 mins ago" },
    ],
    stats: { tasksCompleted: 640, messagesExchanged: 1450, healthPct: 99, latencyMs: 18 }
  },
  bantay: {
    id: "bantay",
    name: "Bantay",
    role: "Cyber & Cloud Security Sentinel",
    department: "Cyber Security",
    avatarColor: "#EF4444",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    textColor: "text-rose-400",
    zone: "command_center",
    deskPos: { x: 78, y: 36 },
    currentPos: { x: 38, y: 46 },
    targetPos: { x: 38, y: 46 },
    state: "WALKING",
    speech: { text: "On my way!", expiresAt: Date.now() + 45000, style: "alert" },
    currentMission: "Investigating rate limit trigger on /api/auth endpoints.",
    linkedModuleUrl: "/admin/owasp-audit",
    recentMessages: [
      { id: "m6", from: "Bantay", to: "Vero", text: "Re-scanning PhilSys National ID checksums.", timestamp: "45s ago" },
    ],
    stats: { tasksCompleted: 2150, messagesExchanged: 5890, healthPct: 100, latencyMs: 6 }
  },
  vero: {
    id: "vero",
    name: "Vero",
    role: "Identity & Trust Verifier",
    department: "Cyber Security",
    avatarColor: "#06B6D4",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    textColor: "text-cyan-400",
    zone: "pantry_lounge",
    deskPos: { x: 88, y: 44 },
    currentPos: { x: 26, y: 54 },
    targetPos: { x: 26, y: 54 },
    state: "IN_LOUNGE",
    speech: null,
    currentMission: "Comparing sitter national ID selfie against Philsys optical baseline.",
    linkedModuleUrl: "/admin/users",
    recentMessages: [
      { id: "m7", from: "Vero", to: "Bantay", text: "Maria Santos KYC verification approved.", timestamp: "4 mins ago" },
    ],
    stats: { tasksCompleted: 780, messagesExchanged: 1920, healthPct: 99, latencyMs: 15 }
  },
  librarian: {
    id: "librarian",
    name: "Librarian",
    role: "SEO & Content Architecture Lead",
    department: "Dev Studio & Marketing",
    avatarColor: "#3B82F6",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    textColor: "text-blue-400",
    zone: "pantry_lounge",
    deskPos: { x: 86, y: 74 },
    currentPos: { x: 25, y: 48 },
    targetPos: { x: 25, y: 48 },
    state: "IN_LOUNGE",
    speech: null,
    currentMission: "Optimizing structured JSON-LD schemas and Google AdSense editorial quality.",
    linkedModuleUrl: "/admin/seo-studio",
    recentMessages: [
      { id: "m8", from: "Librarian", to: "Boss", text: "Top ranking verified for 'pet boarding manila'.", timestamp: "5 mins ago" },
    ],
    stats: { tasksCompleted: 950, messagesExchanged: 2840, healthPct: 97, latencyMs: 22 }
  },
  vercelbot: {
    id: "vercelbot",
    name: "VercelBot",
    role: "DevOps & Automated QA Engine",
    department: "Dev Studio & QA",
    avatarColor: "#8B5CF6",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    textColor: "text-purple-400",
    zone: "gym_zone",
    deskPos: { x: 78, y: 66 },
    currentPos: { x: 44, y: 76 },
    targetPos: { x: 44, y: 76 },
    state: "AT_DESK",
    speech: null,
    currentMission: "Running automated end-to-end regression tests across all 14 routes.",
    linkedModuleUrl: "/admin/qa-testing",
    recentMessages: [
      { id: "m9", from: "VercelBot", to: "Boss", text: "Zero critical bugs. 100% build integrity verified.", timestamp: "1 min ago" },
    ],
    stats: { tasksCompleted: 3100, messagesExchanged: 7800, healthPct: 100, latencyMs: 5 }
  }
};

class OfficeAgentService {
  private agents: Record<AgentId, AgentOfficeProfile> = { ...INITIAL_AGENTS };
  private zones: Record<ZoneId, OfficeZone> = { ...OFFICE_ZONES };
  private eventHistory: InterModuleEvent[] = [];
  private sseClients: Response[] = [];
  private loopInterval: NodeJS.Timeout | null = null;
  private netLiquidity = 127470000; // ₱127.47M
  private simulationSpeed: 1 | 2 = 1;

  constructor() {
    this.startAutonomousLoop();
  }

  // Subscribe a client to Server-Sent Events (SSE)
  public subscribeClient(res: Response) {
    this.sseClients.push(res);
    res.on("close", () => {
      this.sseClients = this.sseClients.filter(c => c !== res);
    });

    // Send initial snapshot
    res.write(`data: ${JSON.stringify({
      type: "OFFICE_INIT",
      agents: this.agents,
      zones: this.zones,
      netLiquidity: this.netLiquidity,
      recentEvents: this.eventHistory.slice(0, 10),
      timestamp: new Date().toISOString()
    })}\n\n`);
  }

  // Broadcast event payload to all active SSE subscribers
  private broadcast(payload: any) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch (err) {
        // Handled on close
      }
    }
  }

  // Return complete current office state
  public getState() {
    return {
      agents: this.agents,
      zones: this.zones,
      netLiquidity: this.netLiquidity,
      recentEvents: this.eventHistory.slice(0, 20),
      activeAgentsCount: Object.keys(this.agents).length,
      connectedClients: this.sseClients.length,
      speed: this.simulationSpeed
    };
  }

  public setSpeed(speed: 1 | 2) {
    this.simulationSpeed = speed;
  }

  // Dispatch a real inter-module mission triggered by admin or system event
  public async dispatchMission(agentId: AgentId, missionType: string, customMessage?: string) {
    const agent = this.agents[agentId];
    if (!agent) return null;

    let targetAgentId: AgentId = "boss";
    let speech = customMessage || "Mission initiated!";
    let summary = `Dispatched ${missionType}`;

    switch (agentId) {
      case "balanse":
        targetAgentId = "kinsenas";
        speech = "Escrow locked! Funds verified in ledger.";
        summary = "Balanse verified multi-key escrow security.";
        this.netLiquidity += 2400;
        break;
      case "bantay":
        targetAgentId = "boss";
        speech = "Security perimeter scanned. 0 threats detected.";
        summary = "OWASP prober completed vulnerability check.";
        break;
      case "librarian":
        targetAgentId = "tala";
        speech = "AdSense editorial compliance at 98/100.";
        summary = "SEO keywords indexed for Metro Manila search.";
        break;
      case "vercelbot":
        targetAgentId = "boss";
        speech = "All 18 QA test suites passed in 142ms.";
        summary = "Automated test runner verified system health.";
        break;
      case "tala":
        targetAgentId = "balanse";
        speech = "New booking matched in Makati!";
        summary = "Pet sitter matched with pet owner.";
        break;
      default:
        targetAgentId = "boss";
        speech = customMessage || "Directing office workflow.";
        summary = `${agent.name} executed ${missionType}`;
        break;
    }

    // Set speech bubble
    agent.speech = {
      text: speech,
      expiresAt: Date.now() + 12000,
      style: "success"
    };
    agent.stats.tasksCompleted += 1;
    agent.stats.messagesExchanged += 1;

    // Record inter-module event
    const event: InterModuleEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: "INTER_AGENT_SYNC",
      sourceAgent: agentId,
      targetAgent: targetAgentId,
      sourceZone: agent.zone,
      targetZone: this.agents[targetAgentId]?.zone || "command_center",
      summary,
      speechText: speech,
      timestamp: new Date().toLocaleTimeString()
    };

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 50) this.eventHistory.pop();

    // Broadcast state update
    this.broadcast({
      type: "AGENT_MISSION_UPDATE",
      agentId,
      agent,
      event,
      netLiquidity: this.netLiquidity
    });

    return { agent, event };
  }

  // Autonomous background lifecycle: agents converse, patrol between desks, and execute routines
  private startAutonomousLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);

    this.loopInterval = setInterval(() => {
      this.tickSimulation();
    }, 4000);
  }

  private tickSimulation() {
    const agentIds = Object.keys(this.agents) as AgentId[];
    const randomAgentId = agentIds[Math.floor(Math.random() * agentIds.length)];
    const agent = this.agents[randomAgentId];
    if (!agent) return;

    // Expire old speech bubbles
    for (const a of Object.values(this.agents)) {
      if (a.speech && a.speech.expiresAt <= Date.now()) {
        a.speech = null;
      }
    }

    // 30% chance for an agent to move or talk
    const actionRoll = Math.random();

    if (actionRoll < 0.3) {
      // Pick a random destination (their desk, pantry lounge, or another zone desk)
      const destinations = [
        agent.deskPos,
        { x: 24, y: 50 }, // Pantry Lounge
        { x: 48, y: 78 }, // Gym Zone
        { x: 50, y: 46 }, // Command Center
      ];
      const target = destinations[Math.floor(Math.random() * destinations.length)];
      agent.targetPos = target;

      // Determine zone from position
      agent.state = target.x < 38 ? "IN_LOUNGE" : target.y > 64 ? "AT_DESK" : "WALKING";

      // Smooth step towards target
      agent.currentPos = {
        x: Math.round(agent.currentPos.x + (target.x - agent.currentPos.x) * 0.4),
        y: Math.round(agent.currentPos.y + (target.y - agent.currentPos.y) * 0.4)
      };

    } else if (actionRoll < 0.55) {
      // Random organic dialog reflecting system functions
      const dialogOptions: Record<AgentId, string[]> = {
        boss: ["Reviewing platform health...", "Net Worth ₱127.47M", "Priority: 100% Escrow Protection", "Great job team!"],
        balanse: ["Escrow ledger reconciled.", "₱2,400 locked in escrow.", "Disbursement ready.", "On my way!"],
        kinsenas: ["Checking GCash API status.", "Payout batch scheduled.", "Time for coffee!", "Ledger balanced."],
        bantay: ["Scanning ports...", "OWASP ASVS grade: A+", "Token verification nominal.", "On my way!"],
        vero: ["PhilSys ID checksum verified.", "Sitter profile approved.", "No KYC backlogs.", "Ready for next check."],
        librarian: ["AdSense score: 98/100", "Keywords re-indexed.", "Writing editorial guide...", "Pantry break."],
        vercelbot: ["Build test passed: 0ms lag.", "Vite bundle optimized.", "Testing sitter routes.", "Nominal."],
        tala: ["12 sitters active in BGC.", "Fast responder rate: 96%", "Matching new booking...", "On my way!"]
      };

      const pool = dialogOptions[agent.id] || ["Working on tasks...", "All nominal."];
      const speechText = pool[Math.floor(Math.random() * pool.length)];

      agent.speech = {
        text: speechText,
        expiresAt: Date.now() + 8000,
        style: speechText.includes("₱") ? "info" : speechText.includes("A+") ? "success" : "info"
      };

      agent.stats.messagesExchanged += 1;
    }

    // Broadcast updated frame
    this.broadcast({
      type: "OFFICE_TICK",
      agents: this.agents,
      netLiquidity: this.netLiquidity,
      timestamp: new Date().toISOString()
    });
  }
}

export const officeAgentService = new OfficeAgentService();
