import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  return res.json() as Promise<CurrentUser>;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  setUser: (u: CurrentUser | null) => void;
  /** Re-fetch session from the server (call after login/signup). */
  refreshUser: () => Promise<CurrentUser | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Wrapper so setting user also persists mock users (for when no real backend)
  const setUser = (u: CurrentUser | null) => {
    if (u) {
      localStorage.setItem("mockUser", JSON.stringify(u));
    } else {
      localStorage.removeItem("mockUser");
    }
    setUserState(u);
  };

  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchCurrentUser();
      if (data) {
        setUser(data);
        return data;
      }
    } catch {}
    // fallback to mock for local testing without backend
    const saved = localStorage.getItem("mockUser");
    if (saved) {
      const mock = JSON.parse(saved);
      setUserState(mock);
      return mock;
    }
    setUserState(null);
    return null;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCurrentUser();
        if (data) {
          setUserState(data);
        } else {
          const saved = localStorage.getItem("mockUser");
          if (saved) setUserState(JSON.parse(saved));
        }
      } catch {
        const saved = localStorage.getItem("mockUser");
        if (saved) setUserState(JSON.parse(saved));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}