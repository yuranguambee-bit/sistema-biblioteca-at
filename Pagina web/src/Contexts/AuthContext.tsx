import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: number;
  nome: string;
  email: string;
  role: string;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('@biblioteca:user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@biblioteca:token'));

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('@biblioteca:user', JSON.stringify(user));
    localStorage.setItem('@biblioteca:token', token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('@biblioteca:user');
    localStorage.removeItem('@biblioteca:token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}