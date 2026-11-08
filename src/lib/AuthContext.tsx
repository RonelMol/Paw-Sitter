import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth, googleAuthProvider } from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  User, 
  signInWithCustomToken 
} from "firebase/auth";

interface AuthContextType {
  user: any | null;
  dbUser: any | null;
  loading: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  login: (role?: string) => Promise<void>;
  loginWithGoogle: (role?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role?: string, phone?: string) => Promise<void>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserDbState: (partialOrFull: any) => void;
  updateMyRole: (role: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem("pawshield_token"));
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      } else if (res.status === 401) {
        // Token expired
        localStorage.removeItem("pawshield_token");
        setSessionToken(null);
        setDbUser(null);
      }
    } catch (e) {
      console.error("Failed to fetch dbUser", e);
    }
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setFirebaseUser(u);
      if (u) {
        try {
          const token = await u.getIdToken(true);
          localStorage.setItem("pawshield_token", token);
          setSessionToken(token);
          await fetchDbUser(token);
        } catch (err) {
          console.warn("Token error:", err);
        }
      } else {
        // If not in Firebase, check local session token
        const localTok = localStorage.getItem("pawshield_token");
        if (localTok) {
          await fetchDbUser(localTok);
        } else {
          setDbUser(null);
        }
      }
      setLoading(false);
    });

    // Initial check for session token if Firebase hasn't fired yet
    const localTok = localStorage.getItem("pawshield_token");
    if (localTok && !dbUser) {
      fetchDbUser(localTok).finally(() => setLoading(false));
    }

    return () => unsub();
  }, []);

  const refreshUser = async () => {
    const tok = sessionToken || (firebaseUser ? await firebaseUser.getIdToken() : localStorage.getItem("pawshield_token"));
    if (tok) {
      await fetchDbUser(tok);
    }
  };

  const updateUserDbState = (partialOrFull: any) => {
    if (!partialOrFull) return;
    setDbUser((prev: any) => {
      if (!prev) return partialOrFull;
      return { ...prev, ...partialOrFull };
    });
  };

  const updateMyRole = async (newRole: string) => {
    const tok = sessionToken || (firebaseUser ? await firebaseUser.getIdToken() : localStorage.getItem("pawshield_token"));
    if (!tok) return false;
    try {
      const res = await fetch("/api/auth/me/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const updated = await res.json();
        setDbUser(updated);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to update role", e);
      return false;
    }
  };

  const syncBackend = async (u: User, role = "PET_OWNER") => {
    const token = await u.getIdToken();
    localStorage.setItem("pawshield_token", token);
    setSessionToken(token);
    const res = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });
    if (res.ok) {
      const data = await res.json();
      setDbUser(data.user || data);
    }
  };

  const loginWithGoogle = async (role = "PET_OWNER") => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    await syncBackend(result.user, role);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await fetch("/api/auth/login-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { error: `Server returned HTTP ${res.status}. Please check your connection.` };
    }

    if (!res.ok) {
      if (data.isSuspended) {
        setDbUser(data.user || { isSuspended: true, suspensionReason: data.suspensionReason });
      }
      const errMsg = data.cause ? `${data.error}: ${data.cause}` : (data.error || "Authentication failed. Please verify credentials.");
      throw new Error(errMsg);
    }

    // Save session
    localStorage.setItem("pawshield_token", data.token);
    setSessionToken(data.token);
    setDbUser(data.user);

    // Attempt Firebase Custom Token sign-in if provided
    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (fbErr) {
        console.warn("Custom token client sync note:", fbErr);
      }
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role = "PET_OWNER", phone?: string) => {
    const res = await fetch("/api/auth/register-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, name, role, phone })
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { error: `Server returned HTTP ${res.status}. Please check your connection.` };
    }
    if (!res.ok) {
      throw new Error(data.cause ? `${data.error}: ${data.cause}` : (data.error || "Registration failed."));
    }

    localStorage.setItem("pawshield_token", data.token);
    setSessionToken(data.token);
    setDbUser(data.user);

    if (data.customToken) {
      try {
        await signInWithCustomToken(auth, data.customToken);
      } catch (fbErr) {
        console.warn("Custom token registration note:", fbErr);
      }
    }
  };

  const changePassword = async (newPassword: string, currentPassword?: string) => {
    const tok = sessionToken || (firebaseUser ? await firebaseUser.getIdToken() : localStorage.getItem("pawshield_token"));
    if (!tok) throw new Error("You must be signed in to change your password.");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok}`
      },
      body: JSON.stringify({ newPassword, currentPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update password.");
    }
    return data;
  };

  const logout = async () => {
    localStorage.removeItem("pawshield_token");
    setSessionToken(null);
    setDbUser(null);
    setFirebaseUser(null);
    await signOut(auth).catch(() => {});
  };

  // Create unified user object supporting getIdToken() across all 60 app calls
  const user = useMemo(() => {
    if (firebaseUser) return firebaseUser;
    if (sessionToken && dbUser) {
      return {
        uid: dbUser.uid,
        email: dbUser.email,
        displayName: dbUser.name,
        getIdToken: async () => sessionToken,
      };
    }
    return null;
  }, [firebaseUser, sessionToken, dbUser]);

  const isSuspended = Boolean(dbUser?.isSuspended);
  const suspensionReason = dbUser?.suspensionReason || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      dbUser, 
      loading, 
      isSuspended,
      suspensionReason,
      login: loginWithGoogle, 
      loginWithGoogle,
      loginWithEmail, 
      registerWithEmail, 
      changePassword,
      logout, 
      refreshUser, 
      updateUserDbState,
      updateMyRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
