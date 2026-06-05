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
  // demo mode extras for artist profile persistence
  displayName?: string;
  bio?: string;
  genres?: string[];
  vibes?: string[];
  spotifyUrl?: string;
  youtubeUrl?: string;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return null;
  return res.json() as Promise<CurrentUser>;
}

// Demo mode: in-memory store for demo accounts (persists during tab/session, reset on refresh/"site offline")
let demoAccountsStore: Record<string, any> = {};

export function getDemoAccounts(): Record<string, any> {
  return { ...demoAccountsStore };
}

export function saveDemoAccount(email: string, data: any) {
  demoAccountsStore[email] = { ...(demoAccountsStore[email] || {}), ...data };
}

export function clearDemoAccounts() {
  demoAccountsStore = {};
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  setUser: (u: CurrentUser | null) => void;
  /** Re-fetch session from the server (call after login/signup). */
  refreshUser: () => Promise<CurrentUser | null>;
  artistMatching: {genres: string[], comp: number};
  setArtistMatchingPrefs: (prefs: {genres: string[], comp: number}) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => null,
  artistMatching: {genres: ["Jazz", "Folk"], comp: 3},
  setArtistMatchingPrefs: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Self-identify prefs in memory (survive navigation/"leave page", reset on refresh/"site offline")
  const [artistMatching, setArtistMatching] = useState<{genres: string[], comp: number}>({genres: ["Jazz", "Folk"], comp: 3});

  // No localStorage for current user in demo (removed on refresh/"site offline")
  const setUser = (u: CurrentUser | null) => {
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
          setUserState(null);
        }
      } catch {
        setUserState(null);
      }
      setLoading(false);
    })();
  }, []);

  // When user changes in demo, load their prefs from demo account if any
  useEffect(() => {
    if (user?.email) {
      const accounts = getDemoAccounts();
      const acc = accounts[user.email];
      if (acc && acc.artistMatching) {
        setArtistMatching(acc.artistMatching);
      } else {
        setArtistMatching({genres: ["Jazz", "Folk"], comp: 3});
      }
    } else {
      setArtistMatching({genres: ["Jazz", "Folk"], comp: 3});
    }
  }, [user?.email]);

  const setArtistMatchingPrefs = (prefs: {genres: string[], comp: number}) => {
    setArtistMatching(prefs);
    if (user?.email) {
      saveDemoAccount(user.email, { artistMatching: prefs });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser, artistMatching, setArtistMatchingPrefs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}