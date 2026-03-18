import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useGetCurrentUser, User, usePupilLogin, useStaffLogin, useParentLogin } from "@workspace/api-client-react";

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

  // Store token in localStorage and update state
  const setToken = (newToken: string) => {
    localStorage.setItem("safeschool_token", newToken);
    setTokenState(newToken);
  };

  const logout = () => {
    localStorage.removeItem("safeschool_token");
    setTokenState(null);
    window.location.href = "/login";
  };

  // We only fetch the current user if we have a token
  const { data: user, isLoading: isUserLoading, isError } = useGetCurrentUser({
    query: {
      enabled: !!token,
      retry: false,
    },
    // Mock passing the token to customFetch via headers if supported, 
    // but typically customFetch reads localStorage directly.
    request: { headers: { Authorization: `Bearer ${token}` } } as any 
  });

  useEffect(() => {
    if (isError) {
      // Token might be invalid or expired
      logout();
    }
  }, [isError]);

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
