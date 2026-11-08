import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Activity, 
  Utensils, 
  Footprints, 
  Pill, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";

interface ComplianceActivity {
  activityId: number;
  bookingId: number;
  title: string;
  activityType: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "PENDING" | "COMPLETED" | "MISSED";
  completedAt: string | null;
  completedBy: string | null;
  completedNotes: string | null;
  instructions: string | null;
  sitterId: number;
  ownerId: number;
  sitterName: string;
  ownerName: string;
  bookingStatus: string;
  startTime: string;
  endTime: string;
}

export function AdminActivityMonitorPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    complianceRate: 100,
  });
  const [activities, setActivities] = useState<ComplianceActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");
  const [sitterFilter, setSitterFilter] = useState("ALL");

  useEffect(() => {
    fetchComplianceData();
  }, [user]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch("/api/bookings/admin/activities-compliance", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed to load activities compliance data");
      }

      const data = await res.json();
      setStats(data.stats || { total: 0, completed: 0, pending: 0, complianceRate: 100 });
      setActivities(data.activities || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (activityId: number, currentStatus: string, bookingId: number) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${bookingId}/activities/${activityId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completedNotes: newStatus === "COMPLETED" ? "Verified & marked by Administrator" : null
        })
      });

      if (res.ok) {
        toast({ 
          title: "Status Updated", 
          description: `Activity marked as ${newStatus}`, 
          type: "success" 
        });
        fetchComplianceData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "FEEDING":
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case "WALKING":
        return <Footprints className="w-4 h-4 text-emerald-600" />;
      case "MEDICATION":
        return <Pill className="w-4 h-4 text-rose-600" />;
      case "POTTY":
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-purple-600" />;
    }
  };

  // Unique sitters for dropdown
  const uniqueSitters = Array.from(new Set(activities.map(a => a.sitterName))).filter(Boolean);

  const filtered = activities.filter(a => {
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.sitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(a.bookingId).includes(searchQuery);

    const matchesStatus = 
      statusFilter === "ALL" ? true : a.status === statusFilter;

    const matchesSitter = 
      sitterFilter === "ALL" ? true : a.sitterName === sitterFilter;

    return matchesSearch && matchesStatus && matchesSitter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Quality & Compliance
            </span>
            <span className="text-xs text-slate-500 font-semibold">Real-Time Sitter Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sitter Activity & Task Compliance Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track whether pet sitters are completing scheduled meals, walks, and medications on time.
          </p>
        </div>

        <button
          onClick={fetchComplianceData}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh Feed
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Activities</span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
          <p className="text-xs text-slate-500 mt-1">Scheduled by pet owners</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">Completed</span>
          <span className="text-2xl font-black text-emerald-700">{stats.completed}</span>
          <p className="text-xs text-emerald-600 mt-1">Logged by sitters</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block mb-1">Pending Tasks</span>
          <span className="text-2xl font-black text-amber-700">{stats.pending}</span>
          <p className="text-xs text-amber-600 mt-1">Awaiting execution</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">Compliance Rate</span>
          <span className="text-2xl font-black text-blue-700">{stats.complianceRate}%</span>
          <p className="text-xs text-blue-600 mt-1">On-schedule execution</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity, sitter, owner, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="PENDING">Pending Only</option>
          </select>

          <select
            value={sitterFilter}
            onChange={(e) => setSitterFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
          >
            <option value="ALL">All Sitters</option>
            {uniqueSitters.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Scheduled Pet Care Activities ({filtered.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Click checkmark to toggle compliance</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No pet activities match your current search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Task & Category</th>
                  <th className="py-3.5 px-4">Scheduled For</th>
                  <th className="py-3.5 px-4">Assigned Sitter</th>
                  <th className="py-3.5 px-4">Customer (Owner)</th>
                  <th className="py-3.5 px-4">Sitter Execution</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(act => (
                  <tr key={act.activityId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(act.activityType)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{act.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-semibold">{act.activityType}</span>
                            {act.instructions && <span className="truncate max-w-[200px]" title={act.instructions}>"{act.instructions}"</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{act.scheduledTime}</span>
                      <span className="block text-[11px] text-slate-500">{act.scheduledDate}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{act.sitterName}</span>
                      <span className="block text-[10px] text-slate-400">ID #{act.sitterId}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{act.ownerName}</span>
                      <span className="block text-[10px] text-slate-400">Booking #{act.bookingId}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {act.status === "COMPLETED" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                          {act.completedNotes && (
                            <p className="text-[10px] text-slate-600 italic mt-0.5 max-w-[200px] truncate" title={act.completedNotes}>
                              {act.completedNotes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(act.activityId, act.status, act.bookingId)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                            act.status === "COMPLETED"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {act.status === "COMPLETED" ? "Mark Pending" : "Mark Done"}
                        </button>
                        <Link
                          to={`/bookings/${act.bookingId}/order-summary`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="View Order Summary"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
