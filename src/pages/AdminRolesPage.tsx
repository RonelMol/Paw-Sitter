import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { ShieldCheck, Plus, Check, Save, Sparkles, CheckSquare, XSquare } from "lucide-react";
import { cn } from "../lib/utils";

const AVAILABLE_MODULES = [
  { 
    id: "sitter_schedule", 
    label: "Pet Sitter: Booked Schedule & Calendar", 
    description: "Manage booked calendar appointments, view confirmed daily schedule, accept/decline booking inquiries, and message pet owners." 
  },
  { 
    id: "sitter_rates", 
    label: "Pet Sitter: Rate Card & Pricing", 
    description: "Configure modality pricing tiers (Boarding, House Sitting, Drop-in, Walking), puppy & medical surcharges, holiday multipliers." 
  },
  { 
    id: "sitter_visits", 
    label: "Pet Sitter: Visit Execution & GPS Tracker", 
    description: "Start visits, live GPS geolocation check-in/out, arrival/departure timestamps, and photo verification." 
  },
  { 
    id: "sitter_profile", 
    label: "Pet Sitter: Territory & Bio Setup", 
    description: "Caregiver biography, service radius (miles), home address coordinates, and verified experience." 
  },
  { 
    id: "owner_search", 
    label: "Pet Owner: Marketplace & Search Flow", 
    description: "Search verified local sitters, view public rates, request meet-and-greets, and book pet care." 
  },
  { 
    id: "owner_pets", 
    label: "Pet Owner: Pet Profiles & Medical Records", 
    description: "Manage pet profiles, vaccination records, behavioral notes, and pre-authorized veterinary spending limits." 
  },
  { 
    id: "admin_users", 
    label: "Platform Admin: User Directory & Provisioning", 
    description: "Manage all platform users, manual account creation, base roles, and custom role assignments." 
  },
  { 
    id: "admin_roles", 
    label: "Platform Admin: Role Definitions & RBAC", 
    description: "Configure custom roles with granular read/write privileges per functional module." 
  },
  { 
    id: "admin_fees", 
    label: "Platform Admin: Monetization & Fee Config", 
    description: "Owner service fee %, fee caps, sitter commission deduction, fixed transaction fee, and live simulator." 
  },
  { 
    id: "admin_analytics", 
    label: "Platform Admin: Financial BI & Analytics", 
    description: "Gross Booking Value (GBV), Net Revenue, Disbursements, Tips, take-rate %, and trend charts." 
  },
  { 
    id: "admin_audit", 
    label: "Platform Admin: System Audit Logs", 
    description: "Append-only immutable audit trail of system events, logins, and fee updates." 
  },
  { 
    id: "buy_me_coffee", 
    label: "Coffee Maintenance Fund & Telemetry", 
    description: "View visitor reach count, outbound click metrics, support attempts, replace Buy Me A Coffee URL, and adjust maintenance settings." 
  },
];

export function AdminRolesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Role Form
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermissions, setNewPermissions] = useState<Record<string, { read: boolean; write: boolean }>>({});
  
  // Editing existing
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, { read: boolean; write: boolean }>>({});

  const fetchRoles = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/roles", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRoles(await res.json());
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load roles", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRoles();
    else setLoading(false);
  }, [user]);

  const togglePermission = (module: string, type: "read" | "write", isNew: boolean) => {
    const targetState = isNew ? newPermissions : editPermissions;
    const setTargetState = isNew ? setNewPermissions : setEditPermissions;
    
    setTargetState(prev => {
      const mod = prev[module] || { read: false, write: false };
      return {
        ...prev,
        [module]: {
          ...mod,
          [type]: !mod[type]
        }
      };
    });
  };

  const applyPreset = (preset: "sitter" | "admin" | "owner") => {
    const perms: Record<string, { read: boolean; write: boolean }> = {};
    if (preset === "sitter") {
      AVAILABLE_MODULES.forEach(m => {
        if (m.id.startsWith("sitter_")) {
          perms[m.id] = { read: true, write: true };
        } else if (m.id.startsWith("owner_")) {
          perms[m.id] = { read: true, write: false };
        } else {
          perms[m.id] = { read: false, write: false };
        }
      });
      setNewRoleName("PET_SITTER_OPERATOR");
    } else if (preset === "admin") {
      AVAILABLE_MODULES.forEach(m => {
        perms[m.id] = { read: true, write: true };
      });
      setNewRoleName("OPERATIONS_ADMIN");
    } else if (preset === "owner") {
      AVAILABLE_MODULES.forEach(m => {
        if (m.id.startsWith("owner_")) {
          perms[m.id] = { read: true, write: true };
        } else {
          perms[m.id] = { read: false, write: false };
        }
      });
      setNewRoleName("CLIENT_PET_OWNER");
    }
    setNewPermissions(perms);
  };

  const handleCreate = async () => {
    if (!newRoleName.trim()) {
      toast({ title: "Validation Error", description: "Role name cannot be empty", type: "error" });
      return;
    }
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/v1/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newRoleName.trim().toUpperCase(),
          permissions: newPermissions
        })
      });

      if (res.ok) {
        toast({ title: "Role Created", description: `Custom role ${newRoleName.toUpperCase()} has been saved.`, type: "success" });
        setShowCreate(false);
        setNewRoleName("");
        setNewPermissions({});
        fetchRoles();
      } else {
         const errText = await res.text();
         let errDesc = errText;
         try {
           const errJson = JSON.parse(errText);
           errDesc = errJson.error || errJson.cause || errDesc;
         } catch(e) {}

         if (res.status === 403) {
           errDesc = "Admin permissions required. Your administrator privileges have been auto-synced. Please try again.";
         } else if (errDesc.includes("<html") || errDesc.includes("<!DOCTYPE")) {
           errDesc = `Server returned status code ${res.status}. Role could not be saved.`;
         }

         toast({ title: "Creation Failed", description: errDesc, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Network Error", description: e.message || "Failed to reach server", type: "error" });
    }
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/v1/admin/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: editPermissions
        })
      });

      if (res.ok) {
        toast({ title: "Role Updated", description: "Permissions updated successfully.", type: "success" });
        setEditingRoleId(null);
        fetchRoles();
      } else {
         const errText = await res.text();
         let errDesc = errText;
         try {
           const errJson = JSON.parse(errText);
           errDesc = errJson.error || errJson.cause || errDesc;
         } catch(e) {}
         
         if (res.status === 403) {
           errDesc = "Admin privileges required to modify roles.";
         } else if (errDesc.includes("<html") || errDesc.includes("<!DOCTYPE")) {
           errDesc = `Server returned status code ${res.status}.`;
         }

         toast({ title: "Update Failed", description: errDesc, type: "error" });
      }
    } catch (e: any) {
      toast({ title: "Network Error", description: e.message || "Failed to reach server", type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Custom Role Definitions & Governance</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure fine-grained read and write permissions across all platform functional modules.
          </p>
        </div>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Define New Role
        </button>
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Configure New Role</h3>
              <p className="text-xs text-slate-500">Provide an identifier and choose permissions for each module.</p>
            </div>
            
            {/* Quick Presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets:
              </span>
              <button 
                type="button" 
                onClick={() => applyPreset("sitter")}
                className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold rounded"
              >
                Pet Sitter Operator
              </button>
              <button 
                type="button" 
                onClick={() => applyPreset("admin")}
                className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded"
              >
                Full Admin
              </button>
            </div>
          </div>

          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Role Name</label>
            <input 
              type="text" 
              placeholder="e.g. PET_SITTER_MANAGER, REGIONAL_MODERATOR" 
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase font-semibold"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-3">Platform Functional Module</th>
                  <th className="px-6 py-3 text-center w-28">Read Access</th>
                  <th className="px-6 py-3 text-center w-28">Write Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {AVAILABLE_MODULES.map(mod => {
                  const p = newPermissions[mod.id] || { read: false, write: false };
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-800 text-sm">{mod.label}</div>
                        <div className="text-xs text-slate-500 font-normal mt-0.5">{mod.description}</div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={p.read} 
                          onChange={() => togglePermission(mod.id, "read", true)} 
                          className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 cursor-pointer" 
                        />
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={p.write} 
                          onChange={() => togglePermission(mod.id, "write", true)} 
                          className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 cursor-pointer" 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
              Save Role Definition
            </button>
            <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ROLES LIST */}
      {loading ? (
        <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No custom roles defined yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {roles.map(role => {
            const isEditing = editingRoleId === role.id;
            const pData = isEditing ? editPermissions : (role.permissions || {});
            
            return (
              <div key={role.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      {role.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Role ID #{role.id}</p>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingRoleId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={() => handleSaveEdit(role.id)} className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center gap-1">
                        <Save className="w-3 h-3" /> Save Changes
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingRoleId(role.id); setEditPermissions(role.permissions || {}); }} className="px-3.5 py-1.5 text-xs font-bold bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                      Edit Permissions
                    </button>
                  )}
                </div>
                
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-100 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-6 py-3">Platform Functional Module</th>
                      <th className="px-6 py-3 text-center w-28">Read Access</th>
                      <th className="px-6 py-3 text-center w-28">Write Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {AVAILABLE_MODULES.map(mod => {
                      const p = pData[mod.id] || { read: false, write: false };
                      return (
                        <tr key={mod.id} className={cn(isEditing ? "hover:bg-slate-50" : "")}>
                          <td className="px-6 py-3 font-medium text-slate-700">
                            <div className="font-semibold text-slate-800 text-sm">{mod.label}</div>
                            <div className="text-xs text-slate-400 font-normal">{mod.description}</div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isEditing ? (
                              <input type="checkbox" checked={p.read} onChange={() => togglePermission(mod.id, "read", false)} className="w-4 h-4 text-slate-900 rounded cursor-pointer" />
                            ) : (
                              p.read ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isEditing ? (
                              <input type="checkbox" checked={p.write} onChange={() => togglePermission(mod.id, "write", false)} className="w-4 h-4 text-slate-900 rounded cursor-pointer" />
                            ) : (
                              p.write ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
