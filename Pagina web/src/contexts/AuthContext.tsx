import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Permissoes {
  obras?: boolean;
  autores?: boolean;
  clientes?: boolean;
  editoras?: boolean;
  emprestimos?: boolean;
  reservas?: boolean;
  historico?: boolean;
  acervo?: boolean;
  relatorios?: boolean;
  manual?: boolean;
  [key: string]: boolean | undefined;
}

interface User {
  id: number;
  nome: string;
  email: string;
  role: string;
  permissoes?: Permissoes;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  temPermissao: (chave: string) => boolean;
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

  // Verifica se o utilizador tem permissão para uma chave
  // Admin tem SEMPRE acesso a tudo
  const temPermissao = useCallback((chave: string): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return user.permissoes?.[chave] === true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}