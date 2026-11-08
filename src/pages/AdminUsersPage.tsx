import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import {
  Users,
  Search,
  ShieldAlert,
  Shield,
  User,
  Plus,
  Key,
  Ban,
  CheckCircle,
  AlertCircle,
  Phone,
  Lock,
  RefreshCw,
  Edit,
  FileCheck,
  Check,
  X,
  CreditCard,
  Trash2,
  AlertTriangle
} from "lucide-react";

export function AdminUsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"USERS" | "KYC">("USERS");

  // KYC list state
  const [kycList, setKycList] = useState<any[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(false);

  // Edit User Modal State (Manual Edit of all Information)
  const [editModalUser, setEditModalUser] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Permanent Delete Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Create User Modal State (aligned with Sign Up)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "123",
    role: "PET_OWNER",
    customRoleId: "",
    phone: "",
  });
  const [creating, setCreating] = useState(false);

  // Password Reset Modal State (Admin Reset Password)
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("123");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Suspension Modal State (Prompt Reason)
  const [suspendModalUser, setSuspendModalUser] = useState<any | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState("");
  const [suspending, setSuspending] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }

      const rolesRes = await fetch("/api/v1/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rolesRes.ok) {
        setCustomRoles(await rolesRes.json());
      }
    } catch (error) {
      toast({ title: "Failed to fetch data", description: "Network error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchKyc();
    }
  }, [user]);

  const fetchKyc = async () => {
    setLoadingKyc(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/sitter-verifications/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setKycList(await res.json());
      }
    } catch (e) {
      console.error("Failed to load KYC list", e);
    } finally {
      setLoadingKyc(false);
    }
  };

  const handleKycStatusChange = async (verifId: number, status: "APPROVED" | "REJECTED", notes?: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/sitter-verifications/${verifId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, adminNotes: notes || "" }),
      });
      if (res.ok) {
        toast({
          title: `KYC ${status === "APPROVED" ? "Approved" : "Rejected"}`,
          description: `Sitter verification status set to ${status}.`,
          type: "success",
        });
        fetchKyc();
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Action Failed", description: err.error || "Failed to update KYC", type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "error" });
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser || !user) return;
    setSavingEdit(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${editModalUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editModalUser.name,
          email: editModalUser.email,
          phone: editModalUser.phone,
          role: editModalUser.role,
          customRoleId: editModalUser.customRoleId ? Number(editModalUser.customRoleId) : null,
          isVerified: editModalUser.isVerified,
          isSuspended: editModalUser.isSuspended,
          suspensionReason: editModalUser.suspensionReason,
          newPassword: editModalUser.newPassword || undefined,
        }),
      });

      if (res.ok) {
        toast({
          title: "User Updated",
          description: `All information for ${editModalUser.email} has been saved.`,
          type: "success",
        });
        setEditModalUser(null);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Update Failed", description: err.error || "Could not update user", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDirectRoleChange = async (userId: number, newRole: string, currentCustomRoleId?: number | null) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole, customRoleId: currentCustomRoleId || null }),
      });

      if (res.ok) {
        toast({
          title: "Role Changed",
          description: `Role successfully updated to ${newRole.replace("_", " ")}.`,
          type: "success",
        });
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Update Failed", description: data.error || "Failed to update role", type: "error" });
      }
    } catch (e) {
      toast({ title: "Update Failed", description: "Network error", type: "error" });
    }
  };

  const handleDirectCustomRoleChange = async (userId: number, currentRole: string, newCustomRoleId: number | null) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: currentRole, customRoleId: newCustomRoleId }),
      });

      if (res.ok) {
        toast({ title: "Custom Role Updated", description: "Custom role override updated.", type: "success" });
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Update Failed", description: data.error || "Failed to update custom role", type: "error" });
      }
    } catch (e) {
      toast({ title: "Update Failed", description: "Network error", type: "error" });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/users/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password || "123",
          role: newUser.role,
          phone: newUser.phone || undefined,
          customRoleId: newUser.customRoleId ? Number(newUser.customRoleId) : null,
        }),
      });

      if (res.ok) {
        const createdUser = await res.json();
        toast({
          title: "User Created Successfully",
          description: `Account created for ${createdUser.email} (Password: ${newUser.password || "123"}).`,
          type: "success",
        });
        setShowCreateModal(false);
        setNewUser({ name: "", email: "", password: "123", role: "PET_OWNER", customRoleId: "", phone: "" });
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Creation Failed", description: data.error || "Failed to create user", type: "error" });
      }
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error.message || "Failed to reach server", type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!newPasswordInput || newPasswordInput.trim().length < 3) {
      toast({ title: "Invalid Password", description: "Password must be at least 3 characters.", type: "error" });
      return;
    }

    setResettingPassword(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${passwordModalUser.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Password Reset Successfully",
          description: `New password saved for ${passwordModalUser.email}.`,
          type: "success",
        });
        setPasswordModalUser(null);
        setNewPasswordInput("123");
        fetchUsers();
      } else {
        toast({ title: "Password Reset Failed", description: data.error || "Could not reset password", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalUser) return;
    if (!suspendReasonInput.trim()) {
      toast({ title: "Reason Required", description: "Please enter the reason for suspension.", type: "error" });
      return;
    }

    setSuspending(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${suspendModalUser.id}/suspend`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: suspendReasonInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "User Suspended",
          description: `User suspended. Real-time prompt alert dispatched to user.`,
          type: "success",
        });
        setSuspendModalUser(null);
        setSuspendReasonInput("");
        fetchUsers();
      } else {
        toast({ title: "Suspension Failed", description: data.error || "Could not suspend user", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspendUser = async (u: any) => {
    if (!confirm(`Are you sure you want to lift the suspension for ${u.name || u.email}?`)) return;

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${u.id}/unsuspend`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast({ title: "Suspension Lifted", description: `User ${u.email} restored to full active standing.`, type: "success" });
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: "Action Failed", description: data.error || "Failed to unsuspend user", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handlePermanentDeleteUser = async () => {
    if (!deleteModalUser || !user) return;
    setDeletingUser(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/v1/admin/users/${deleteModalUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          title: "User Permanently Deleted",
          description: data.message || `Account ${deleteModalUser.email} and all data were totally removed from the database.`,
          type: "success",
        });
        setDeleteModalUser(null);
        if (editModalUser?.id === deleteModalUser.id) {
          setEditModalUser(null);
        }
        fetchUsers();
      } else {
        toast({
          title: "Deletion Failed",
          description: data.error || "Could not delete user from database.",
          type: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Network connection error",
        type: "error",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
          <div>
            <h1 className="text-white font-black text-base tracking-wide uppercase">Role & Access Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Reset Admin/User passwords, suspend accounts with prompt reasons in real-time, and create manual accounts aligned with Sign Up.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Manual User
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("USERS")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "USERS"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab("KYC");
            fetchKyc();
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "KYC"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileCheck className="w-4 h-4 text-purple-500" />
          <span>Sitter KYC & Disbursement Approvals</span>
          {kycList.filter((k) => k.status === "PENDING").length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {kycList.filter((k) => k.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "USERS" ? (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span>Total: {users.length} accounts</span>
            <button
              onClick={fetchUsers}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              title="Refresh users"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3.5">User Identity</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Account Status</th>
                <th className="px-6 py-3.5">Custom Role</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions & Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No accounts match your query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentLoggedUser = u.email.toLowerCase() === (user?.email || "").toLowerCase();
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentLoggedUser ? "bg-amber-50/30" : ""
                      } ${u.isSuspended ? "bg-red-50/40" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900">{u.name || "Unnamed User"}</div>
                          {isCurrentLoggedUser && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</div>
                        {u.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {u.role === "ADMIN" ? (
                            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : u.role === "PET_SITTER" ? (
                            <User className="w-4 h-4 text-purple-600 shrink-0" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <select
                            value={u.role}
                            onChange={(e) => handleDirectRoleChange(u.id, e.target.value, u.customRoleId)}
                            className={`border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer outline-none shadow-2xs ${
                              u.role === "ADMIN"
                                ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
                                : u.role === "PET_SITTER"
                                ? "bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100"
                                : "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100"
                            }`}
                            title="Click to change base role immediately"
                          >
                            <option value="PET_OWNER">PET OWNER</option>
                            <option value="PET_SITTER">PET SITTER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.isSuspended ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <Ban className="w-3 h-3" />
                              Suspended
                            </span>
                            {u.suspensionReason && (
                              <p className="text-[11px] text-red-700 italic max-w-xs line-clamp-2" title={u.suspensionReason}>
                                "{u.suspensionReason}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={u.customRoleId || ""}
                          onChange={(e) =>
                            handleDirectCustomRoleChange(u.id, u.role, e.target.value ? Number(e.target.value) : null)
                          }
                          className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="">-- No Custom Role --</option>
                          {customRoles.map((cr) => (
                            <option key={cr.id} value={cr.id}>
                              {cr.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end flex-wrap gap-1.5">
                          {/* Edit All Info */}
                          <button
                            onClick={() => {
                              setEditModalUser({
                                id: u.id,
                                name: u.name || "",
                                email: u.email || "",
                                phone: u.phone || "",
                                role: u.role || "PET_OWNER",
                                customRoleId: u.customRoleId || "",
                                isVerified: Boolean(u.isVerified),
                                isSuspended: Boolean(u.isSuspended),
                                suspensionReason: u.suspensionReason || "",
                                newPassword: "",
                              });
                            }}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 transition-colors"
                            title="Manually edit all information of this user"
                          >
                            <Edit className="w-3 h-3 text-blue-600" />
                            Edit Info
                          </button>

                          {/* Reset Password Action for Admin and any User */}
                          <button
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPasswordInput("123");
                            }}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 transition-colors"
                            title="Reset password for this user or admin"
                          >
                            <Key className="w-3 h-3 text-slate-600" />
                            Reset Password
                          </button>

                          {/* Suspend / Unsuspend Actions */}
                          {u.isSuspended ? (
                            <>
                              <button
                                onClick={() => {
                                  setSuspendModalUser(u);
                                  setSuspendReasonInput(u.suspensionReason || "");
                                }}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors"
                                title="Update prompt suspension reason"
                              >
                                Edit Reason
                              </button>
                              <button
                                onClick={() => handleUnsuspendUser(u)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition-colors"
                                title="Restore account standing"
                              >
                                Unsuspend
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSuspendModalUser(u);
                                setSuspendReasonInput("");
                              }}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 transition-colors"
                              title="Suspend this user account with prompt reason"
                            >
                              <Ban className="w-3 h-3 text-red-600" />
                              Suspend
                            </button>
                          )}

                          {/* Total Permanent Delete Option from Database */}
                          {!isCurrentLoggedUser && (
                            <button
                              onClick={() => setDeleteModalUser(u)}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Totally delete this user and all associated records from Database"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        /* KYC & Disbursement Review Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sitter KYC & Disbursement Verification</h2>
              <p className="text-xs text-slate-500">Review government IDs and bank accounts. Approving locks the sitter's disbursement details.</p>
            </div>
            <button
              onClick={fetchKyc}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh List
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-3.5">Sitter Identity</th>
                  <th className="px-6 py-3.5">Government ID</th>
                  <th className="px-6 py-3.5">Disbursement Account</th>
                  <th className="px-6 py-3.5">KYC Status</th>
                  <th className="px-6 py-3.5 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingKyc ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading KYC submissions...</td>
                  </tr>
                ) : kycList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No sitter KYC submissions recorded yet.</td>
                  </tr>
                ) : (
                  kycList.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{k.legal_first_name} {k.legal_last_name}</div>
                        <div className="text-slate-500 text-xs">{k.user_email || k.email}</div>
                        <div className="text-[11px] text-slate-400">{k.mobile_number} • {k.city || "PH"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{k.id_type}</div>
                        <div className="text-xs font-mono text-slate-500">{k.id_number}</div>
                        {k.id_front_url && (
                          <a
                            href={k.id_front_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:underline font-semibold block mt-0.5"
                          >
                            View ID Document ↗
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          {k.bank_name || "N/A"}
                        </div>
                        <div className="text-xs text-slate-600">{k.bank_account_name}</div>
                        <div className="text-xs font-mono text-slate-500">{k.bank_account_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        {k.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Approved & Locked
                          </span>
                        ) : k.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {k.status !== "APPROVED" && (
                            <button
                              onClick={() => handleKycStatusChange(k.id, "APPROVED")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                              title="Approve KYC and Lock Disbursement Account"
                            >
                              <Check className="w-3 h-3" /> Approve KYC
                            </button>
                          )}
                          {k.status !== "REJECTED" && (
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason for sitter:", "Discrepancy in ID document");
                                if (reason !== null) {
                                  handleKycStatusChange(k.id, "REJECTED", reason);
                                }
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual User Creation Modal (Aligned with Sign Up) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in">
            <h2 className="text-xl font-black text-slate-900 mb-1">Create Manual User (Sign Up Aligned)</h2>
            <p className="text-xs text-slate-500 mb-5">
              Provision a verified account directly into the database. Fully aligned with sign-up standards.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Sitter Two"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="sitter2@yahoo.com"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Password *</label>
                <input
                  required
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Default: 123"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default set to '123' for fast test logins.</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="0917 123 4567"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Base Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="PET_OWNER">PET OWNER</option>
                    <option value="PET_SITTER">PET SITTER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Custom Role</label>
                  <select
                    value={newUser.customRoleId}
                    onChange={(e) => setNewUser({ ...newUser, customRoleId: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="">-- None --</option>
                    {customRoles.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create & Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal for Admin & User Profile */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center mb-3">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Reset Password</h2>
            <p className="text-xs text-slate-500 mb-4">
              Set a new password for <span className="font-bold text-slate-800">{passwordModalUser.email}</span> ({passwordModalUser.role}).
            </p>
            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (e.g. 123)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput("123")}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                  >
                    Quick: "123"
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPasswordInput("Password123!")}
                    className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                  >
                    Quick: "Password123!"
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {resettingPassword ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Suspension Prompt Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-3">
              <Ban className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              {suspendModalUser.isSuspended ? "Update Suspension Reason" : "Suspend User Account"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter the prompt reason for suspending <span className="font-bold text-slate-800">{suspendModalUser.email}</span>.
              This message will be displayed to the user in real-time across their session.
            </p>
            <form onSubmit={handleConfirmSuspend} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Suspension Reason (Prompt Message) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReasonInput}
                  onChange={(e) => setSuspendReasonInput(e.target.value)}
                  placeholder="e.g. Identity verification discrepancy detected; multiple failed caregiver background checks."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 leading-relaxed">
                ⚠️ While suspended, the user will be blocked from creating bookings, receiving payouts, or accepting jobs, and will see this reason immediately.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSuspendModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suspending}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {suspending ? "Applying..." : "Confirm & Dispatch Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Edit User Modal (Admin Complete User Edit) */}
      {editModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-in fade-in my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Edit User Details</h2>
                  <p className="text-xs text-slate-500">ID #{editModalUser.id} • {editModalUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalUser(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editModalUser.name}
                    onChange={(e) => setEditModalUser({ ...editModalUser, name: e.target.value })}
                    placeholder="User's full name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editModalUser.phone}
                    onChange={(e) => setEditModalUser({ ...editModalUser, phone: e.target.value })}
                    placeholder="+63 912 345 6789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={editModalUser.email}
                  onChange={(e) => setEditModalUser({ ...editModalUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Platform Role *
                  </label>
                  <select
                    value={editModalUser.role}
                    onChange={(e) => setEditModalUser({ ...editModalUser, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="PET_OWNER">PET OWNER</option>
                    <option value="PET_SITTER">PET SITTER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Custom Role
                  </label>
                  <select
                    value={editModalUser.customRoleId || ""}
                    onChange={(e) => setEditModalUser({ ...editModalUser, customRoleId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="">-- No Custom Role --</option>
                    {customRoles.map((cr) => (
                      <option key={cr.id} value={cr.id}>
                        {cr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editModalUser.isVerified}
                    onChange={(e) => setEditModalUser({ ...editModalUser, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Verified User / Sitter Status
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editModalUser.isSuspended}
                    onChange={(e) => setEditModalUser({ ...editModalUser, isSuspended: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    Suspend User Account
                  </span>
                </label>

                {editModalUser.isSuspended && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
                      Suspension Reason
                    </label>
                    <input
                      type="text"
                      value={editModalUser.suspensionReason}
                      onChange={(e) => setEditModalUser({ ...editModalUser, suspensionReason: e.target.value })}
                      placeholder="Reason for suspension..."
                      className="w-full px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-medium text-red-900 focus:ring-2 focus:ring-red-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Reset Password Optional */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Change Password (Leave blank to keep unchanged)
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={editModalUser.newPassword || ""}
                    onChange={(e) => setEditModalUser({ ...editModalUser, newPassword: e.target.value })}
                    placeholder="Enter new password to override"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = users.find(u => u.id === editModalUser.id) || editModalUser;
                    setDeleteModalUser(target);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete User Permanently
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {savingEdit ? "Saving..." : "Save All Information"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-red-100">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-1">
              Permanently Delete User & All Data?
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              This action is <span className="font-bold text-red-600">irreversible</span>. It will completely purge this user record and all associated records from the PostgreSQL database and Firebase Auth.
            </p>

            {/* Target Account Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">User Account:</span>
                <span className="font-bold text-slate-900">{deleteModalUser.name || "Unnamed User"}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Email Address:</span>
                <span className="font-mono font-bold text-slate-800">{deleteModalUser.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Account Role:</span>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black ${
                  deleteModalUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                  deleteModalUser.role === 'PET_SITTER' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {deleteModalUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Database User ID:</span>
                <span className="font-mono text-slate-600">#{deleteModalUser.id}</span>
              </div>
            </div>

            {/* Cascade Purge Details */}
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-[11px] text-red-800 space-y-1.5 mb-5 leading-relaxed">
              <div className="font-bold text-red-900 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-700" />
                The following linked items will be completely erased:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-red-700 pl-1">
                {deleteModalUser.role === "PET_SITTER" && (
                  <>
                    <li>Sitter profile, bio, photo gallery & routine specs</li>
                    <li>Configured rates, modality pricing cards & weekly availability schedules</li>
                    <li>KYC submissions & disbursement bank accounts</li>
                  </>
                )}
                {deleteModalUser.role === "PET_OWNER" && (
                  <>
                    <li>All registered pet profiles, medical requirements & feeding rules</li>
                    <li>Veterinary authorization forms & clinic emergency records</li>
                  </>
                )}
                <li>All past and active booking contracts & escrow records</li>
                <li>Visit check-in cards, care activity logs & direct messages</li>
                <li>Firebase Authentication login credentials & active sessions</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                disabled={deletingUser}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteUser}
                disabled={deletingUser}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deletingUser ? "Deleting from Database..." : "Permanently Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
