import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { useGetCurrentUser, User, usePupilLogin, useStaffLogin, useParentLogin } from "@workspace/api-client-react";

const PUPIL_INACTIVITY_TIMEOUT_MS = 90 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"] as const;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("safeschool_token"));
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setToken = (newToken: string) => {
    localStorage.setItem("safeschool_token", newToken);
    setTokenState(newToken);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("safeschool_token");
    setTokenState(null);
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    window.location.href = "/login";
  }, []);

  const { data: user, isLoading: isUserLoading, isError } = useGetCurrentUser({
    query: {
      enabled: !!token,
      retry: false,
    },
    request: { headers: { Authorization: `Bearer ${token}` } } as any 
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  useEffect(() => {
    if (!user || user.role !== "pupil") return;

    const resetTimer = () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      inactivityTimer.current = setTimeout(() => {
        logout();
      }, PUPIL_INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: !!token && isUserLoading,
        isAuthenticated: !!user,
        logout,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
