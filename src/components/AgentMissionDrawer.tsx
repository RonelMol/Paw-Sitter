import React, { useState } from "react";
import { Link } from "react-router";
import { AgentOfficeProfile, AgentId, OFFICE_ZONES } from "../services/OfficeAgentService";
import {
  X,
  ExternalLink,
  Play,
  Activity,
  Send,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  RefreshCw,
  Cpu,
  DollarSign
} from "lucide-react";

interface AgentMissionDrawerProps {
  agent: AgentOfficeProfile | null;
  onClose: () => void;
  onDispatchMission: (agentId: AgentId, missionType: string, customMessage?: string) => Promise<void>;
}

export function AgentMissionDrawer({
  agent,
  onClose,
  onDispatchMission
}: AgentMissionDrawerProps) {
  const [dispatching, setDispatching] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  if (!agent) return null;

  const zone = OFFICE_ZONES[agent.zone];

  const handleQuickDispatch = async (missionType: string, message: string) => {
    setDispatching(true);
    try {
      await onDispatchMission(agent.id, missionType, message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 border-l border-slate-800 text-white shadow-2xl backdrop-blur-md flex flex-col justify-between overflow-hidden animate-slide-left">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shadow-lg"
            style={{
              backgroundColor: `${agent.avatarColor}20`,
              borderColor: agent.avatarColor,
              color: agent.avatarColor
            }}
          >
            {agent.name[0]}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">{agent.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${agent.badgeBg}`}>
                {agent.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{agent.department}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* Current Active Mission Card */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Live Mission Directive
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              RUNNING
            </span>
          </div>

          <p className="text-sm font-semibold text-white leading-relaxed">
            {agent.currentMission}
          </p>

          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>Current Zone: <strong className="text-white">{zone?.name || agent.zone}</strong></span>
            <span>Latency: <strong className="font-mono text-emerald-400">{agent.stats.latencyMs}ms</strong></span>
          </div>
        </div>

        {/* Real-Time Module Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <div className="font-mono text-lg font-black text-white">{agent.stats.tasksCompleted}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Missions Done</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <div className="font-mono text-lg font-black text-amber-400">{agent.stats.messagesExchanged}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Inter-Agent Syncs</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-center">
            <div className="font-mono text-lg font-black text-emerald-400">{agent.stats.healthPct}%</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Health State</div>
          </div>
        </div>

        {/* Linked Platform Module Nav */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Linked Microservice Route:</div>
            <div className="font-mono font-bold text-slate-200 mt-0.5">{agent.linkedModuleUrl}</div>
          </div>
          <Link
            to={agent.linkedModuleUrl}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-colors text-xs"
          >
            <span>Open View</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>

        {/* Inter-Agent Message Log Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
              Recent Inter-Module Messages
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Live Audit Trail</span>
          </div>

          <div className="space-y-2">
            {agent.recentMessages.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-300 flex items-center gap-1">
                    {m.from} <ArrowRight className="w-2.5 h-2.5 text-slate-500" /> {m.to}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{m.timestamp}</span>
                </div>
                <p className="text-slate-300 leading-normal">{m.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dispatch Quick Actions */}
        <div className="space-y-2">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
            Instant Mission Commands
          </span>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={dispatching}
              onClick={() => handleQuickDispatch("TASK_SYNC", "Executing priority sync with peer modules.")}
              className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">Dispatch Routine Sync</span>
              </div>
              <span className="text-[10px] text-slate-400">Execute</span>
            </button>

            {agent.id === "balanse" && (
              <button
                type="button"
                disabled={dispatching}
                onClick={() => handleQuickDispatch("ESCROW_RECONCILE", "Escrow ₱2,400 verified in ledger.")}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold">Reconcile Escrow Balance</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">+₱2.4K</span>
              </button>
            )}

            {agent.id === "bantay" && (
              <button
                type="button"
                disabled={dispatching}
                onClick={() => handleQuickDispatch("SECURITY_SWEEP", "OWASP ASVS scan completed: 0 findings.")}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-bold">Run Deep OWASP Security Scan</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono">ASVS 2026</span>
              </button>
            )}

            {agent.id === "vercelbot" && (
              <button
                type="button"
                disabled={dispatching}
                onClick={() => handleQuickDispatch("REGRESSION_RUN", "All 18 QA test suites verified: 0 errors.")}
                className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-bold">Trigger Automated QA Suites</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono">CI/CD</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Dismiss Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">Autonomous loop active</span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
