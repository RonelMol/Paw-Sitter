import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  User, Plus, PawPrint, Save, Trash2, Edit, Edit3, Shield, ArrowRight, Check, Key, Lock, 
  Ban, AlertTriangle, ShieldCheck, Camera, Upload, Image as ImageIcon, X, Loader2 
} from "lucide-react";
import { SitterProfileEditor } from "../components/SitterProfileEditor";

export function ProfilePage() {
  const { user, dbUser, updateMyRole, refreshUser, changePassword } = useAuth();
  const { toast } = useToast();
  const [switchingRole, setSwitchingRole] = useState(false);
  
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Password Reset State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // New Pet Form State
  const [showAddPet, setShowAddPet] = useState(false);
  const [newPet, setNewPet] = useState({
    name: "",
    type: "Dog",
    breed: "",
    age: "",
    weight: "", // in kg
    photoUrl: "",
    foodType: "Dry Kibble",
    foodGramsPerMeal: "",
    foodFrequency: "2x Daily (Morning & Evening)",
    otherNotes: "",
    behavioralNotes: ""
  });
  const [adding, setAdding] = useState(false);

  // Edit Pet State
  const [editingPetId, setEditingPetId] = useState<number | null>(null);
  const [editPet, setEditPet] = useState<{
    id: number;
    name: string;
    type: string;
    breed: string;
    age: string;
    weight: string;
    photoUrl: string;
    foodType: string;
    foodGramsPerMeal: string;
    foodFrequency: string;
    otherNotes: string;
    behavioralNotes: string;
  } | null>(null);
  const [updatingPet, setUpdatingPet] = useState(false);

  // User Profile Picture Upload State
  const [uploadingUserPhoto, setUploadingUserPhoto] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [userPhotoInput, setUserPhotoInput] = useState("");

  const handleUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Photo Too Large",
        description: "Please select an image smaller than 5MB.",
        type: "error"
      });
      return;
    }

    setUploadingUserPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === "string") {
        const photoData = reader.result;
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/auth/me/profile", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ profilePicture: photoData })
          });

          if (res.ok) {
            await refreshUser();
            toast({
              title: "Avatar Updated! 🎉",
              description: "Your new profile photo has been saved.",
              type: "success"
            });
            setShowPhotoModal(false);
          } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to update profile picture");
          }
        } catch (err: any) {
          toast({
            title: "Upload Failed",
            description: err.message || "Could not save photo. Please try again.",
            type: "error"
          });
        } finally {
          setUploadingUserPhoto(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoUrl = async (urlToSave: string) => {
    if (!urlToSave || !user) return;
    setUploadingUserPhoto(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/auth/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: urlToSave })
      });

      if (res.ok) {
        await refreshUser();
        toast({
          title: "Profile Picture Saved!",
          description: "Your profile photo is updated.",
          type: "success"
        });
        setShowPhotoModal(false);
        setUserPhotoInput("");
      } else {
        throw new Error("Failed to save avatar URL");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setUploadingUserPhoto(false);
    }
  };

  const handleRemoveUserPhoto = async () => {
    if (!user) return;
    setUploadingUserPhoto(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/auth/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ profilePicture: "" })
      });

      if (res.ok) {
        await refreshUser();
        toast({
          title: "Photo Removed",
          description: "Default initial avatar restored.",
          type: "info"
        });
        setShowPhotoModal(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to remove photo", type: "error" });
    } finally {
      setUploadingUserPhoto(false);
    }
  };

  // Photo upload helper for both Add and Edit pet forms
  const handlePetPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "Photo Too Large",
        description: "Please select an image smaller than 3MB.",
        type: "error"
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const photoData = reader.result;
        if (isEditMode && editPet) {
          setEditPet({ ...editPet, photoUrl: photoData });
        } else {
          setNewPet(prev => ({ ...prev, photoUrl: photoData }));
        }
        toast({
          title: "Photo Attached",
          description: "Pet photo preview updated. Save to confirm changes.",
          type: "info"
        });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!user) return;
    const fetchPets = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/pets", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPets(data);
        }
      } catch (e) {
        console.error("Failed to fetch pets", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, [user]);

  const handleStartEditPet = (pet: any) => {
    setShowAddPet(false);
    setEditingPetId(pet.id);
    setEditPet({
      id: pet.id,
      name: pet.name || "",
      type: pet.type || "Dog",
      breed: pet.breed || "",
      age: pet.age !== null && pet.age !== undefined ? String(pet.age) : "",
      weight: pet.weight !== null && pet.weight !== undefined ? String(pet.weight) : "",
      photoUrl: pet.photoUrl || "",
      foodType: pet.foodType || "Dry Kibble",
      foodGramsPerMeal: pet.foodGramsPerMeal !== null && pet.foodGramsPerMeal !== undefined ? String(pet.foodGramsPerMeal) : "",
      foodFrequency: pet.foodFrequency || "2x Daily (Morning & Evening)",
      otherNotes: pet.otherNotes || "",
      behavioralNotes: pet.behavioralNotes || ""
    });
  };

  const handleCancelEditPet = () => {
    setEditingPetId(null);
    setEditPet(null);
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editPet) return;
    if (!editPet.name.trim()) {
      toast({ title: "Name Required", description: "Please enter your pet's name.", type: "error" });
      return;
    }

    setUpdatingPet(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        name: editPet.name.trim(),
        type: editPet.type,
        breed: editPet.breed.trim() || null,
        age: editPet.age ? Number(editPet.age) : null,
        weight: editPet.weight ? Number(editPet.weight) : null,
        photoUrl: editPet.photoUrl || null,
        foodType: editPet.foodType || "Dry Kibble",
        foodGramsPerMeal: editPet.foodGramsPerMeal ? Number(editPet.foodGramsPerMeal) : null,
        foodFrequency: editPet.foodFrequency || "2x Daily (Morning & Evening)",
        otherNotes: editPet.otherNotes.trim() || null,
        behavioralNotes: editPet.behavioralNotes.trim() || null
      };

      const res = await fetch(`/api/pets/${editPet.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const updatedPet = data.pet || data;
        setPets(prev => prev.map(p => p.id === editPet.id ? updatedPet : p));
        setEditingPetId(null);
        setEditPet(null);
        toast({ title: "Pet Updated", description: `${updatedPet.name}'s profile and photo have been updated.`, type: "success" });
      } else {
        const err = await res.json();
        toast({ title: "Failed to Update Pet", description: err.error, type: "error" });
      }
    } catch (e) {
      toast({ title: "Failed to Update Pet", description: "Network error", type: "error" });
    } finally {
      setUpdatingPet(false);
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPet.name.trim()) {
       toast({ title: "Name Required", description: "Please enter your pet's name.", type: "error" });
       return;
    }
    
    setAdding(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        ...newPet,
        name: newPet.name.trim(),
        breed: newPet.breed.trim() || undefined,
        age: newPet.age ? Number(newPet.age) : null,
        weight: newPet.weight ? Number(newPet.weight) : null,
        photoUrl: newPet.photoUrl || undefined,
        foodGramsPerMeal: newPet.foodGramsPerMeal ? Number(newPet.foodGramsPerMeal) : null,
        foodType: newPet.foodType || "Dry Kibble",
        foodFrequency: newPet.foodFrequency || "2x Daily (Morning & Evening)",
        otherNotes: newPet.otherNotes.trim() || undefined,
        behavioralNotes: newPet.behavioralNotes.trim() || undefined
      };

      const res = await fetch("/api/pets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setPets(prev => [...prev, data.pet]);
        setShowAddPet(false);
        setNewPet({ 
          name: "", 
          type: "Dog", 
          breed: "", 
          age: "", 
          weight: "", 
          photoUrl: "",
          foodType: "Dry Kibble", 
          foodGramsPerMeal: "", 
          foodFrequency: "2x Daily (Morning & Evening)", 
          otherNotes: "", 
          behavioralNotes: "" 
        });
        toast({ title: "Pet Added", description: `${data.pet.name} has been added to your profile.`, type: "success" });
      } else {
        const err = await res.json();
        toast({ title: "Failed to Add Pet", description: err.error, type: "error" });
      }
    } catch (e) {
      toast({ title: "Failed to Add Pet", description: "Network error", type: "error" });
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePet = async (petId: number, petName: string) => {
     if (!user) return;
     if (!confirm(`Are you sure you want to remove ${petName}?`)) return;

     try {
       const token = await user.getIdToken();
       const res = await fetch(`/api/pets/${petId}`, {
         method: "DELETE",
         headers: { Authorization: `Bearer ${token}` }
       });
       
       if (res.ok) {
         setPets(prev => prev.filter(p => p.id !== petId));
         toast({ title: "Pet Removed", description: `${petName} has been removed.`, type: "success" });
       }
     } catch (e) {
       toast({ title: "Failed to Remove", description: "Network error", type: "error" });
     }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 3) {
      toast({ title: "Password Too Short", description: "Please enter at least 3 characters.", type: "error" });
      return;
    }

    setUpdatingPassword(true);
    try {
      const ok = await changePassword(newPassword.trim(), currentPassword.trim() || undefined);
      if (ok) {
        toast({ title: "Password Updated", description: "Your new password is now active.", type: "success" });
        setNewPassword("");
        setCurrentPassword("");
      } else {
        toast({ title: "Update Failed", description: "Could not change password. Please check your credentials.", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      
      {/* Real-time Suspension Banner */}
      {dbUser?.isSuspended && (
        <div className="mb-8 p-5 rounded-2xl bg-red-50 border border-red-300 text-red-900 flex items-start gap-4 shadow-sm animate-in fade-in">
          <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
            <Ban className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-red-900 uppercase tracking-wide flex items-center gap-2">
              Account Suspended by Administration
            </h3>
            <p className="text-xs text-red-800 mt-1 font-semibold">
              Reason: <span className="font-bold underline">{dbUser.suspensionReason || "Administrative security compliance audit"}</span>
            </p>
            <p className="text-[11px] text-red-700 mt-1.5 leading-relaxed">
              Your account cannot initiate, confirm, or complete bookings while in suspended status. If you believe this is in error, please contact administration.
            </p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
         <User className="w-8 h-8 text-blue-600" /> My Profile
      </h1>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* User Details & Security Column */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Account Details</h2>
            
            {/* User Profile Picture & Header Synchronizer */}
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100">
              <div className="relative group">
                {dbUser?.profilePicture || user?.photoURL ? (
                  <img
                    src={dbUser?.profilePicture || user?.photoURL || ""}
                    alt="Profile Avatar"
                    className="w-16 h-16 rounded-2xl border-2 border-emerald-300 object-cover shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xl font-black shadow-xs">
                    {((dbUser?.name || user?.displayName || user?.email)?.[0] || "U").toUpperCase()}
                  </div>
                )}
                
                {/* Camera upload badge button */}
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  disabled={uploadingUserPhoto}
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-slate-900 text-white hover:bg-emerald-600 rounded-xl shadow-md border-2 border-white transition-all transform active:scale-95"
                  title="Upload / Change Profile Picture"
                  aria-label="Upload / Change Profile Picture"
                >
                  {uploadingUserPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {dbUser?.name || user?.displayName || "Member"}
                </h3>
                <p className="text-xs text-slate-500 truncate">{user?.email || "No email"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> {dbUser?.role || "Member"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Upload / Edit Modal */}
            {showPhotoModal && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">Update Profile Picture</h3>
                        <p className="text-xs text-slate-500">Upload a photo from your device or paste a URL</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Current Preview */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative">
                      {dbUser?.profilePicture || user?.photoURL ? (
                        <img
                          src={dbUser?.profilePicture || user?.photoURL || ""}
                          alt="Avatar Preview"
                          className="w-24 h-24 rounded-3xl border-4 border-emerald-100 object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-3xl font-black shadow-md border-4 border-slate-100">
                          {((dbUser?.name || user?.displayName || user?.email)?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium mt-2">Current Avatar</span>
                  </div>

                  {/* Upload file directly */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Option 1: Upload from Device
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-4 cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1" />
                      <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                        {uploadingUserPhoto ? "Uploading & Saving..." : "Choose Image File"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingUserPhoto}
                        onChange={handleUserPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Or Enter Image URL */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Option 2: Paste Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={userPhotoInput}
                        onChange={(e) => setUserPhotoInput(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePhotoUrl(userPhotoInput.trim())}
                        disabled={!userPhotoInput.trim() || uploadingUserPhoto}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Quick Avatar Presets */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Option 3: Quick Avatar Presets
                    </label>
                    <div className="flex items-center gap-2 justify-between">
                      {[
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
                        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSavePhotoUrl(presetUrl)}
                          className="w-10 h-10 rounded-full border-2 border-slate-200 hover:border-emerald-500 overflow-hidden shadow-xs hover:scale-110 transition-transform"
                        >
                          <img src={presetUrl} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Remove Photo */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {(dbUser?.profilePicture || user?.photoURL) && (
                      <button
                        type="button"
                        onClick={handleRemoveUserPhoto}
                        disabled={uploadingUserPhoto}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(false)}
                      className="ml-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Legal Name</label>
                <div className="text-sm font-medium text-slate-900">{dbUser?.name || user?.displayName || "N/A"}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                <div className="text-sm font-medium text-slate-900">{dbUser?.phone || "Not configured"}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <div className="text-sm font-medium text-slate-900">{user?.email || "N/A"}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Role</label>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2.5 py-1 text-xs font-black rounded uppercase tracking-wider ${
                    dbUser?.role === "ADMIN" 
                      ? "bg-amber-100 text-amber-800 border border-amber-200" 
                      : dbUser?.role === "PET_SITTER" 
                      ? "bg-purple-100 text-purple-800 border border-purple-200" 
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}>
                    {dbUser?.role ? dbUser.role.replace("_", " ") : "PET OWNER"}
                  </span>
                  {dbUser?.role === "ADMIN" && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="w-3.5 h-3.5" /> Full Access
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Switch Role selector - Strictly for Platform Admin Only */}
              {dbUser?.role === "ADMIN" && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Switch Account Role
                    </label>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                      Admin Only
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["ADMIN", "PET_SITTER", "PET_OWNER"] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        disabled={switchingRole || dbUser?.role === r}
                        onClick={async () => {
                          setSwitchingRole(true);
                          const ok = await updateMyRole(r);
                          setSwitchingRole(false);
                          if (ok) {
                            toast({ title: "Role Updated", description: `Account role switched to ${r.replace("_", " ")}.`, type: "success" });
                          } else {
                            toast({ title: "Update Failed", description: "Could not switch role.", type: "error" });
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                          dbUser?.role === r
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        {r === "PET_OWNER" ? "Owner" : r === "PET_SITTER" ? "Sitter" : "Admin"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                 {dbUser?.isSuspended ? (
                   <div className="text-xs font-bold text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-200">
                     <Ban className="w-3.5 h-3.5 text-red-600" />
                     Suspended
                   </div>
                 ) : (
                   <div className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Active Standing
                   </div>
                 )}
              </div>
            </div>

            {dbUser?.role === "ADMIN" && (
              <Link 
                to="/admin/users" 
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Shield className="w-4 h-4 text-amber-400" /> Open Platform Admin Directory <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Quick Link to My Bookings & Orders for Pet Owners */}
            {dbUser?.role !== "PET_SITTER" && (
              <Link 
                to="/my-bookings" 
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <PawPrint className="w-4 h-4 text-white" /> View All My Orders & Bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* User Profile Reset Password Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            {!showPasswordForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-600" /> Account Security
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your password and login credentials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-600" /> Reset Password
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setCurrentPassword("");
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Update your account login password. Minimum 3 characters.
                </p>
                <form
                  onSubmit={async (e) => {
                    await handleUpdatePassword(e);
                    setShowPasswordForm(false);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Current Password (Optional)
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password if set"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
                    >
                      {updatingPassword ? "Updating..." : "Save New Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: For Pet Sitters, display the Personal Info & Profile Picture Editor. For Pet Owners, display My Pets */}
        <div className="flex-1">
          {dbUser?.role === "PET_SITTER" ? (
            <SitterProfileEditor />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PawPrint className="w-6 h-6 text-slate-700" /> My Pets
                </h2>
                {!showAddPet && (
                  <button 
                    onClick={() => setShowAddPet(true)}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Pet
                  </button>
                )}
              </div>

              {showAddPet && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <PawPrint className="w-5 h-5 text-purple-600" /> Add a New Pet Profile
                    </h3>
                    <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-bold">
                      Care & Nutrition Details
                    </span>
                  </div>

                  <form onSubmit={handleAddPet} className="space-y-4">
                    {/* Pet Photo Upload Section */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                        {newPet.photoUrl ? (
                          <img 
                            src={newPet.photoUrl} 
                            alt="Pet preview" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-2">
                            <PawPrint className="w-6 h-6 text-slate-300 mx-auto" />
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">No Photo</span>
                          </div>
                        )}
                        {newPet.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setNewPet({ ...newPet, photoUrl: "" })}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                          Pet Picture / Avatar
                        </label>
                        <p className="text-xs text-slate-500 mb-2.5">
                          Upload a clear photo of your pet to help your sitter recognize and care for them. (PNG/JPG up to 3MB)
                        </p>
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs">
                            <Upload className="w-3.5 h-3.5 text-purple-600" />
                            Upload Photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePetPhotoUpload(e, false)} 
                            />
                          </label>
                          {newPet.photoUrl && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Photo attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Pet Name *
                        </label>
                        <input 
                          type="text" required value={newPet.name} onChange={e => setNewPet({...newPet, name: e.target.value})}
                          placeholder="e.g. Milo"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Animal Type *
                        </label>
                        <select 
                          value={newPet.type} onChange={e => setNewPet({...newPet, type: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Rabbit">Rabbit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Breed
                        </label>
                        <input 
                          type="text" value={newPet.breed || ""} onChange={e => setNewPet({...newPet, breed: e.target.value})}
                          placeholder="e.g. Golden Retriever, Aspin, Shih Tzu"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" step="0.1" value={newPet.weight || ""} onChange={e => setNewPet({...newPet, weight: e.target.value})}
                            placeholder="e.g. 12.5"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Age (Years)
                        </label>
                        <input 
                          type="number" value={newPet.age || ""} onChange={e => setNewPet({...newPet, age: e.target.value})}
                          placeholder="e.g. 3"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" 
                        />
                      </div>
                    </div>

                    {/* Nutrition & Feeding Plan */}
                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-amber-700">
                        🥩 Feeding & Nutrition Plan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Food Type</label>
                          <select
                            value={newPet.foodType}
                            onChange={e => setNewPet({...newPet, foodType: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="Dry Kibble">Dry Kibble</option>
                            <option value="Wet Canned Food">Wet Canned Food</option>
                            <option value="Raw Diet (BARF)">Raw Diet (BARF)</option>
                            <option value="Home-Cooked (Boiled Chicken/Rice)">Home-Cooked</option>
                            <option value="Mixed (Kibble + Wet Topper)">Mixed (Kibble + Wet)</option>
                            <option value="Prescription Veterinary Diet">Prescription Diet</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Grams per Meal</label>
                          <div className="relative">
                            <input 
                              type="number" step="5" value={newPet.foodGramsPerMeal || ""} 
                              onChange={e => setNewPet({...newPet, foodGramsPerMeal: e.target.value})}
                              placeholder="e.g. 150"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium" 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">g</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Feeding Frequency</label>
                          <select
                            value={newPet.foodFrequency}
                            onChange={e => setNewPet({...newPet, foodFrequency: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="1x Daily (Morning)">1x Daily (Morning)</option>
                            <option value="2x Daily (Morning & Evening)">2x Daily (Morning & Evening)</option>
                            <option value="3x Daily (Morning, Noon, Evening)">3x Daily (Morning, Noon, Evening)</option>
                            <option value="Free-Feeding (Dry bowl always filled)">Free-Feeding</option>
                            <option value="Custom Schedule">Custom Schedule</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Behavioral Notes & Sitter Instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Behavioral Notes & Temperament
                        </label>
                        <textarea 
                          value={newPet.behavioralNotes || ""} onChange={e => setNewPet({...newPet, behavioralNotes: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-20"
                          placeholder="e.g. Friendly with cats, needs slow leash greetings, afraid of thunderstorms..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Other Things for Sitter to Know (Optional)
                        </label>
                        <textarea 
                          value={newPet.otherNotes || ""} onChange={e => setNewPet({...newPet, otherNotes: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-20"
                          placeholder="e.g. Favorite squeaky toy, treats before bedtime, crate location, commands they know..."
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                      <button type="button" onClick={() => setShowAddPet(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                      <button type="submit" disabled={adding} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                        <Save className="w-4 h-4" /> {adding ? "Saving..." : "Save Pet Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Edit Pet Modal/Inline Form */}
              {editingPetId && editPet && (
                <div className="bg-white rounded-2xl shadow-md border-2 border-indigo-200 p-6 mb-6 transition-all animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-indigo-600" /> Update Pet Information: {editPet.name}
                    </h3>
                    <button 
                      type="button" 
                      onClick={handleCancelEditPet}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="Cancel Editing"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdatePet} className="space-y-4">
                    {/* Pet Photo Update Section */}
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-indigo-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                        {editPet.photoUrl ? (
                          <img 
                            src={editPet.photoUrl} 
                            alt={editPet.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-2">
                            <PawPrint className="w-6 h-6 text-indigo-300 mx-auto" />
                            <span className="text-[10px] text-indigo-400 font-semibold block mt-0.5">No Photo</span>
                          </div>
                        )}
                        {editPet.photoUrl && (
                          <button
                            type="button"
                            onClick={() => setEditPet({ ...editPet, photoUrl: "" })}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                          Update Pet Picture
                        </label>
                        <p className="text-xs text-slate-600 mb-2.5">
                          Change or upload a new photo of {editPet.name || "your pet"}. (PNG/JPG up to 3MB)
                        </p>
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-900 rounded-xl text-xs font-bold transition shadow-xs">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            Choose New Photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePetPhotoUpload(e, true)} 
                            />
                          </label>
                          {editPet.photoUrl && (
                            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Photo attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Pet Name *
                        </label>
                        <input 
                          type="text" required value={editPet.name} onChange={e => setEditPet({...editPet, name: e.target.value})}
                          placeholder="e.g. Milo"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Animal Type *
                        </label>
                        <select 
                          value={editPet.type} onChange={e => setEditPet({...editPet, type: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Rabbit">Rabbit</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Breed
                        </label>
                        <input 
                          type="text" value={editPet.breed || ""} onChange={e => setEditPet({...editPet, breed: e.target.value})}
                          placeholder="e.g. Golden Retriever, Aspin, Shih Tzu"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" step="0.1" value={editPet.weight || ""} onChange={e => setEditPet({...editPet, weight: e.target.value})}
                            placeholder="e.g. 12.5"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Age (Years)
                        </label>
                        <input 
                          type="number" value={editPet.age || ""} onChange={e => setEditPet({...editPet, age: e.target.value})}
                          placeholder="e.g. 3"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" 
                        />
                      </div>
                    </div>

                    {/* Nutrition & Feeding Plan */}
                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-amber-700">
                        🥩 Feeding & Nutrition Plan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Food Type</label>
                          <select
                            value={editPet.foodType}
                            onChange={e => setEditPet({...editPet, foodType: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="Dry Kibble">Dry Kibble</option>
                            <option value="Wet Canned Food">Wet Canned Food</option>
                            <option value="Raw Diet (BARF)">Raw Diet (BARF)</option>
                            <option value="Home-Cooked (Boiled Chicken/Rice)">Home-Cooked</option>
                            <option value="Mixed (Kibble + Wet Topper)">Mixed (Kibble + Wet)</option>
                            <option value="Prescription Veterinary Diet">Prescription Diet</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Grams per Meal</label>
                          <div className="relative">
                            <input 
                              type="number" step="5" value={editPet.foodGramsPerMeal || ""} 
                              onChange={e => setEditPet({...editPet, foodGramsPerMeal: e.target.value})}
                              placeholder="e.g. 150"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium" 
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">g</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Feeding Frequency</label>
                          <select
                            value={editPet.foodFrequency}
                            onChange={e => setEditPet({...editPet, foodFrequency: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="1x Daily (Morning)">1x Daily (Morning)</option>
                            <option value="2x Daily (Morning & Evening)">2x Daily (Morning & Evening)</option>
                            <option value="3x Daily (Morning, Noon, Evening)">3x Daily (Morning, Noon, Evening)</option>
                            <option value="Free-Feeding (Dry bowl always filled)">Free-Feeding</option>
                            <option value="Custom Schedule">Custom Schedule</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Behavioral Notes & Sitter Instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Behavioral Notes & Temperament
                        </label>
                        <textarea 
                          value={editPet.behavioralNotes || ""} onChange={e => setEditPet({...editPet, behavioralNotes: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none h-20"
                          placeholder="e.g. Friendly with cats, needs slow leash greetings, afraid of thunderstorms..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Other Things for Sitter to Know (Optional)
                        </label>
                        <textarea 
                          value={editPet.otherNotes || ""} onChange={e => setEditPet({...editPet, otherNotes: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none h-20"
                          placeholder="e.g. Favorite squeaky toy, treats before bedtime, crate location, commands they know..."
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={handleCancelEditPet} 
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={updatingPet} 
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                      >
                        {updatingPet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                        {updatingPet ? "Updating..." : "Update Pet Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-slate-100 rounded-2xl w-full"></div>
                    <div className="h-24 bg-slate-100 rounded-2xl w-full"></div>
                </div>
              ) : pets.length === 0 && !showAddPet ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                  <PawPrint className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No pets found.</p>
                  <p className="text-sm text-slate-400 mt-1">Add a pet with photo, weight in kg, nutrition specs, and breed to start booking sitters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pets.map(pet => (
                    <div 
                      key={pet.id} 
                      className={`bg-white p-5 rounded-2xl shadow-sm border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                        editingPetId === pet.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Left: Pet Photo Avatar */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                          {pet.photoUrl ? (
                            <img 
                              src={pet.photoUrl} 
                              alt={pet.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="text-center">
                              <PawPrint className="w-7 h-7 text-purple-400 mx-auto" />
                              <span className="text-[9px] font-bold text-purple-700/60 uppercase">Paw</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditPet(pet)}
                            className="absolute bottom-0 inset-x-0 bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold py-0.5 text-center flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
                            title="Edit photo"
                          >
                            <Camera className="w-2.5 h-2.5" /> Edit
                          </button>
                        </div>

                        {/* Middle: Details */}
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                              {pet.name}
                            </h3>
                            <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                              {pet.type}
                            </span>
                            {pet.breed && (
                              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                Breed: {pet.breed}
                              </span>
                            )}
                            {pet.weight && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                ⚖️ {pet.weight} kg
                              </span>
                            )}
                            {pet.age && (
                              <span className="bg-slate-50 text-slate-600 text-xs px-2 py-0.5 rounded font-medium">
                                {pet.age} {Number(pet.age) === 1 ? 'yr' : 'yrs'} old
                              </span>
                            )}
                          </div>

                          {/* Nutrition & Feeding Badge Block */}
                          {(pet.foodType || pet.foodGramsPerMeal || pet.foodFrequency) && (
                            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                🥣 Nutrition:
                              </span>
                              {pet.foodType && <span><strong>Type:</strong> {pet.foodType}</span>}
                              {pet.foodGramsPerMeal && <span><strong>Portion:</strong> {pet.foodGramsPerMeal}g per meal</span>}
                              {pet.foodFrequency && <span><strong>Frequency:</strong> {pet.foodFrequency}</span>}
                            </div>
                          )}

                          {pet.behavioralNotes && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <strong>Behavior & Temperament:</strong> {pet.behavioralNotes}
                            </p>
                          )}

                          {pet.otherNotes && (
                            <p className="text-xs text-indigo-900 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                              <strong>Sitter Notes:</strong> {pet.otherNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end md:self-start shrink-0 pt-2 md:pt-0">
                        <button 
                          onClick={() => handleStartEditPet(pet)} 
                          className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5" 
                          title="Update Pet Info & Photo"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit Info
                        </button>
                        <button 
                          onClick={() => handleDeletePet(pet.id, pet.name)} 
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                          title="Remove Pet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
